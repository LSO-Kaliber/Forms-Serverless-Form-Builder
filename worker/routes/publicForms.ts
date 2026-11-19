import { Hono } from 'hono';
import type { Env } from '../types';
import type { FormField, FormPage, FormRecord, FormSchema, PublicFormView } from '@shared/types';
import { ERROR_CODES } from '@shared/errors';
import { normalizeEmailWebmailUmm, normalizeNimUmm, verifyMagicBytes } from '@shared/presets';
import { validateFormSubmission } from '@shared/validator';
import { checkRateLimit, generateEditToken, hashSha256 } from '../auth';
import { verifyTurnstile } from '../turnstile';
import { putFileToR2, sanitizeFilename } from '../storage';

export const publicFormsRouter = new Hono<{ Bindings: Env }>();

// Get public form view
publicFormsRouter.get('/forms/:slug', async (c) => {
  const slug = c.req.param('slug').toLowerCase();

  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE slug = ?')
    .bind(slug)
    .first<FormRecord>();

  if (!form) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  if (form.status === 'draft') {
    // Return generic not-found to avoid leaking that a draft form exists.
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  // Check closes_at
  const now = new Date();
  const isExpired = form.closes_at ? new Date(form.closes_at) <= now : false;
  const isClosed = form.status === 'closed' || isExpired;

  // Check quota
  const countRes = await c.env.DB.prepare('SELECT COUNT(*) as count FROM responses WHERE form_id = ?')
    .bind(form.id)
    .first<{ count: number }>();
  const currentCount = countRes?.count ?? 0;
  const isFull = form.max_responses !== null && currentCount >= form.max_responses;

  // Fetch published schema version
  const versionRecord = await c.env.DB.prepare(
    'SELECT schema_json FROM form_versions WHERE form_id = ? AND version = ?'
  )
    .bind(form.id, form.current_version)
    .first<{ schema_json: string }>();

  let schema: FormSchema;
  if (versionRecord?.schema_json) {
    schema = JSON.parse(versionRecord.schema_json);
  } else {
    schema = JSON.parse(form.draft_schema_json);
  }

  const publicView: PublicFormView = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description || '',
    status: form.status,
    version: form.current_version,
    schema,
    allow_edit: Boolean(form.allow_edit),
    closes_at: form.closes_at,
    custom_thank_you: form.custom_thank_you,
    unique_field_id: form.unique_field_id,
    is_closed: isClosed,
    is_full: isFull,
  };

  return c.json({ form: publicView });
});

// File upload
publicFormsRouter.post('/forms/:slug/upload', async (c) => {
  const slug = c.req.param('slug').toLowerCase();
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';

  // Rate limit
  const allowed = await checkRateLimit(c.env.UPLOAD_LIMITER, `upload:${ip}`);
  if (!allowed) {
    return c.json({ errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED }, 429);
  }

  const form = await c.env.DB.prepare('SELECT id, status, current_version, draft_schema_json FROM forms WHERE slug = ?').bind(slug).first<FormRecord>();
  if (!form) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const fieldId = (formData.get('fieldId') as string) || '';

  if (!file) {
    return c.json({ errorCode: ERROR_CODES.FILE_TIDAK_DITEMUKAN }, 400);
  }

  // Check file size (max 3 MB)
  const MAX_SIZE = 3 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return c.json({ errorCode: ERROR_CODES.FILE_TERLALU_BESAR }, 400);
  }

  const filename = sanitizeFilename(file.name || 'uploaded_file');
  const ext = filename.split('.').pop() || '';
  const mime = file.type || 'application/octet-stream';

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ errorCode: ERROR_CODES.FILE_TERLALU_BESAR }, 400);
  }

  const bytes = new Uint8Array(buffer);

  // Magic bytes check
  const isAllowed = verifyMagicBytes(bytes, ext, mime);
  if (!isAllowed) {
    return c.json({ errorCode: ERROR_CODES.MAGIC_BYTES_TIDAK_VALID }, 400);
  }

  // Verify field-level allowedFileTypes and maxFileSizeMB if fieldId is specified
  if (fieldId) {
    let formSchema: FormSchema | null = null;
    if (form.current_version > 0) {
      const vRec = await c.env.DB.prepare(
        'SELECT schema_json FROM form_versions WHERE form_id = ? AND version = ?'
      )
        .bind(form.id, form.current_version)
        .first<{ schema_json: string }>();
      if (vRec?.schema_json) {
        try { formSchema = JSON.parse(vRec.schema_json); } catch {}
      }
    }
    if (!formSchema && form.draft_schema_json) {
      try { formSchema = JSON.parse(form.draft_schema_json); } catch {}
    }
    if (formSchema) {
      let targetField: FormField | null = null;
      for (const p of formSchema.pages) {
        const found = p.fields.find((item) => item.id === fieldId);
        if (found) { targetField = found; break; }
      }
      // Enforce field-level maxFileSizeMB when configured (must be respected over the global cap)
      if (targetField?.validation?.maxFileSizeMB !== undefined) {
        const fieldMaxBytes = (targetField.validation.maxFileSizeMB ?? 3) * 1024 * 1024;
        if (file.size > fieldMaxBytes) {
          return c.json({ errorCode: ERROR_CODES.FILE_TERLALU_BESAR }, 400);
        }
      }
      if (targetField?.validation?.allowedFileTypes && targetField.validation.allowedFileTypes.length > 0) {
        const isImg = mime.startsWith('image/');
        const isDoc = mime === 'application/pdf' || ext === 'docx' || ext === 'xlsx';
        const isZip = ext === 'zip' || mime.includes('zip');
        const allowed = targetField.validation.allowedFileTypes;
        const match =
          (isImg && allowed.includes('image')) ||
          (isDoc && allowed.includes('document')) ||
          (isZip && allowed.includes('zip'));
        if (!match) {
          return c.json({ errorCode: ERROR_CODES.TIPE_FILE_TIDAK_DIIZINKAN }, 400);
        }
      }
    }
  }

  const fileId = `file_${crypto.randomUUID().replace(/-/g, '')}`;
  const r2Key = `forms/${form.id}/${fileId}-${filename}`;
  const now = new Date().toISOString();

  // Save to R2
  await putFileToR2(c.env.STORAGE, r2Key, buffer, mime, filename);

  // Save pending record in D1
  await c.env.DB.prepare(
    `INSERT INTO files (id, response_id, form_id, field_id, r2_key, filename, size, mime, status, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  )
    .bind(fileId, form.id, fieldId, r2Key, filename, file.size, mime, now)
    .run();

  return c.json({
    file: {
      id: fileId,
      filename,
      size: file.size,
      mime,
      download_url: `/api/public/files/${fileId}`,
    },
  }, 201);
});

// Submit response
publicFormsRouter.post('/forms/:slug/submit', async (c) => {
  const slug = c.req.param('slug').toLowerCase();
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';

  // Rate limit
  const rateLimitOk = await checkRateLimit(c.env.SUBMIT_LIMITER, `submit:${ip}`);
  if (!rateLimitOk) {
    return c.json({ errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED }, 429);
  }

  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE slug = ?').bind(slug).first<FormRecord>();
  if (!form || form.status === 'draft') {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const { answers = {}, turnstileToken, honeypot } = body;
  const idempotencyKey = c.req.header('idempotency-key') || body.idempotencyKey || null;

  // Check idempotency key deduplication
  if (idempotencyKey) {
    const existing = await c.env.DB.prepare(
      'SELECT id, edit_token_hash FROM responses WHERE form_id = ? AND idempotency_key = ?'
    )
      .bind(form.id, idempotencyKey)
      .first<{ id: string; edit_token_hash: string | null }>();

    if (existing) {
      return c.json({
        success: true,
        responseId: existing.id,
        customThankYou: form.custom_thank_you,
        isIdempotentReplay: true,
      }, 200);
    }
  }

  // Honeypot check
  if (honeypot && String(honeypot).trim() !== '') {
    return c.json({ errorCode: ERROR_CODES.BOT_TERDETEKSI }, 400);
  }

  // Turnstile check
  const turnstileCheck = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET, ip);
  if (!turnstileCheck.success) {
    return c.json({ errorCode: ERROR_CODES.TURNSTILE_GAGAL }, 400);
  }

  // Closes at check
  const now = new Date();
  if (form.status === 'closed' || (form.closes_at && new Date(form.closes_at) <= now)) {
    return c.json({ errorCode: ERROR_CODES.FORM_DITUTUP }, 400);
  }

  // Load published schema version
  const versionRecord = await c.env.DB.prepare(
    'SELECT schema_json FROM form_versions WHERE form_id = ? AND version = ?'
  )
    .bind(form.id, form.current_version)
    .first<{ schema_json: string }>();

  const schema: FormSchema = versionRecord?.schema_json
    ? JSON.parse(versionRecord.schema_json)
    : JSON.parse(form.draft_schema_json);

  // Validate submission using shared validator & evaluator
  const validation = validateFormSubmission(schema, answers);
  if (!validation.valid) {
    return c.json({ errorCode: ERROR_CODES.FORMAT_TIDAK_VALID, errors: validation.errors }, 400);
  }

  // Determine unique key if unique_field_id is configured
  let uniqueKey: string | null = null;
  if (form.unique_field_id) {
    const rawVal = validation.cleanedAnswers[form.unique_field_id];
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      // Find field type
      let fieldType = '';
      for (const p of schema.pages) {
        const found = p.fields.find((f) => f.id === form.unique_field_id);
        if (found) {
          fieldType = found.type;
          break;
        }
      }
      if (fieldType === 'nim_umm') {
        uniqueKey = normalizeNimUmm(String(rawVal));
      } else if (fieldType === 'email_umm') {
        uniqueKey = normalizeEmailWebmailUmm(String(rawVal));
      } else {
        uniqueKey = String(rawVal).trim().toLowerCase();
      }
    }
  }

  const responseId = `resp_${crypto.randomUUID().replace(/-/g, '')}`;
  const editToken = generateEditToken();
  const editTokenHash = await hashSha256(editToken);
  const nowIso = now.toISOString();

  // Atomic conditional insert to check max_responses quota in one statement
  const atomicInsertSql = `
    INSERT INTO responses (id, form_id, form_version, data_json, unique_key, edit_token_hash, idempotency_key, submitted_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE (
      SELECT COUNT(*) FROM responses WHERE form_id = ?
    ) < (
      SELECT COALESCE(max_responses, 999999999) FROM forms WHERE id = ?
    )
  `;

  try {
    const insertResult = await c.env.DB.prepare(atomicInsertSql)
      .bind(
        responseId,
        form.id,
        form.current_version,
        JSON.stringify(validation.cleanedAnswers),
        uniqueKey,
        editTokenHash,
        idempotencyKey,
        nowIso,
        nowIso,
        form.id,
        form.id
      )
      .run();

    // If changes === 0, the conditional WHERE clause was false (quota is full)
    const changes = insertResult.meta?.changes ?? 1;
    if (changes === 0) {
      return c.json({ errorCode: ERROR_CODES.KUOTA_PENUH }, 400);
    }
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    if (errMsg.includes('UNIQUE') && errMsg.includes('idempotency_key')) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM responses WHERE form_id = ? AND idempotency_key = ?'
      ).bind(form.id, idempotencyKey).first<{ id: string }>();
      if (existing) {
        return c.json({
          success: true,
          responseId: existing.id,
          customThankYou: form.custom_thank_you,
          isIdempotentReplay: true,
        }, 200);
      }
    }
    // Check if duplicate unique_key constraint failed
    if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('unique_key')) {
      return c.json({ errorCode: ERROR_CODES.NIM_SUDAH_TERDAFTAR }, 400);
    }
    console.error('[SUBMIT] Gagal menyimpan respons:', err);
    return c.json({ errorCode: ERROR_CODES.TERJADI_KESALAHAN }, 500);
  }

  // Attach pending files
  const fileIds: string[] = [];
  for (const [key, val] of Object.entries(validation.cleanedAnswers)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item?.id) fileIds.push(item.id);
        else if (typeof item === 'string' && item.startsWith('file_')) fileIds.push(item);
      }
    } else if (typeof val === 'object' && val?.id) {
      fileIds.push(val.id);
    } else if (typeof val === 'string' && val.startsWith('file_')) {
      fileIds.push(val);
    }
  }

  if (fileIds.length > 0) {
    const placeholders = fileIds.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE files SET status = 'attached', response_id = ? WHERE id IN (${placeholders}) AND form_id = ?`
    )
      .bind(responseId, ...fileIds, form.id)
      .run();
  }

  // Mark files belonging to hidden fields as deleted
  if (validation.hiddenFieldIds.length > 0) {
    const hiddenPlaceholders = validation.hiddenFieldIds.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE files SET status = 'deleted' WHERE form_id = ? AND field_id IN (${hiddenPlaceholders}) AND status = 'pending'`
    )
      .bind(form.id, ...validation.hiddenFieldIds)
      .run();
  }

  return c.json({
    success: true,
    responseId,
    editToken: form.allow_edit ? editToken : undefined,
    customThankYou: form.custom_thank_you,
  }, 201);
});

// Get response for editing
publicFormsRouter.get('/edit/:token', async (c) => {
  const token = c.req.param('token');
  const tokenHash = await hashSha256(token);

  const resp = await c.env.DB.prepare('SELECT * FROM responses WHERE edit_token_hash = ?')
    .bind(tokenHash)
    .first<any>();

  if (!resp) {
    return c.json({ errorCode: ERROR_CODES.TOKEN_EDIT_TIDAK_VALID }, 404);
  }

  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(resp.form_id).first<FormRecord>();
  if (!form || !form.allow_edit) {
    return c.json({ errorCode: ERROR_CODES.EDIT_TIDAK_DIIZINKAN }, 403);
  }

  const now = new Date();
  if (form.status !== 'published' || (form.closes_at && new Date(form.closes_at) <= now)) {
    return c.json({ errorCode: ERROR_CODES.FORM_DITUTUP }, 403);
  }

  // Fetch version schema used when response was created
  const versionRecord = await c.env.DB.prepare(
    'SELECT schema_json FROM form_versions WHERE form_id = ? AND version = ?'
  )
    .bind(form.id, resp.form_version)
    .first<{ schema_json: string }>();

  const schema: FormSchema = versionRecord?.schema_json
    ? JSON.parse(versionRecord.schema_json)
    : JSON.parse(form.draft_schema_json);

  let answers = {};
  try {
    answers = JSON.parse(resp.data_json);
  } catch {}

  return c.json({
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      unique_field_id: form.unique_field_id,
      closes_at: form.closes_at,
    },
    schema,
    answers,
    submitted_at: resp.submitted_at,
  });
});

// Update response via edit token
publicFormsRouter.put('/edit/:token', async (c) => {
  const token = c.req.param('token');
  const tokenHash = await hashSha256(token);

  const resp = await c.env.DB.prepare('SELECT * FROM responses WHERE edit_token_hash = ?')
    .bind(tokenHash)
    .first<any>();

  if (!resp) {
    return c.json({ errorCode: ERROR_CODES.TOKEN_EDIT_TIDAK_VALID }, 404);
  }

  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(resp.form_id).first<FormRecord>();
  if (!form || !form.allow_edit) {
    return c.json({ errorCode: ERROR_CODES.EDIT_TIDAK_DIIZINKAN }, 403);
  }

  const now = new Date();
  if (form.status !== 'published' || (form.closes_at && new Date(form.closes_at) <= now)) {
    return c.json({ errorCode: ERROR_CODES.FORM_DITUTUP }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const rawAnswers = body.answers || {};

  let previousAnswers: Record<string, any> = {};
  try {
    previousAnswers = JSON.parse(resp.data_json);
  } catch {}

  // Lock unique field: preserve existing value for unique field
  if (form.unique_field_id) {
    rawAnswers[form.unique_field_id] = previousAnswers[form.unique_field_id];
  }

  const versionRecord = await c.env.DB.prepare(
    'SELECT schema_json FROM form_versions WHERE form_id = ? AND version = ?'
  )
    .bind(form.id, resp.form_version)
    .first<{ schema_json: string }>();

  const schema: FormSchema = versionRecord?.schema_json
    ? JSON.parse(versionRecord.schema_json)
    : JSON.parse(form.draft_schema_json);

  const validation = validateFormSubmission(schema, rawAnswers);
  if (!validation.valid) {
    return c.json({ errorCode: ERROR_CODES.FORMAT_TIDAK_VALID, errors: validation.errors }, 400);
  }

  const nowIso = now.toISOString();
  await c.env.DB.prepare(
    'UPDATE responses SET data_json = ?, updated_at = ? WHERE id = ?'
  )
    .bind(JSON.stringify(validation.cleanedAnswers), nowIso, resp.id)
    .run();

  // Extract all file IDs previously attached to this response
  const previousFileIds: string[] = [];
  for (const val of Object.values(previousAnswers)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item?.id) previousFileIds.push(item.id);
        else if (typeof item === 'string' && item.startsWith('file_')) previousFileIds.push(item);
      }
    } else if (typeof val === 'object' && val?.id) {
      previousFileIds.push(val.id);
    } else if (typeof val === 'string' && val.startsWith('file_')) {
      previousFileIds.push(val);
    }
  }

  // Attach any newly added files
  const newFileIds: string[] = [];
  for (const [key, val] of Object.entries(validation.cleanedAnswers)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item?.id) newFileIds.push(item.id);
        else if (typeof item === 'string' && item.startsWith('file_')) newFileIds.push(item);
      }
    } else if (typeof val === 'object' && val?.id) {
      newFileIds.push(val.id);
    } else if (typeof val === 'string' && val.startsWith('file_')) {
      newFileIds.push(val);
    }
  }

  if (newFileIds.length > 0) {
    const placeholders = newFileIds.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE files SET status = 'attached', response_id = ? WHERE id IN (${placeholders}) AND form_id = ?`
    )
      .bind(resp.id, ...newFileIds, form.id)
      .run();
  }

  // Mark files that were replaced or removed as deleted
  const retainedFileIds = new Set(newFileIds);
  const replacedFileIds = previousFileIds.filter((fid) => !retainedFileIds.has(fid));
  if (replacedFileIds.length > 0) {
    const placeholders = replacedFileIds.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE files SET status = 'deleted' WHERE response_id = ? AND id IN (${placeholders})`
    )
      .bind(resp.id, ...replacedFileIds)
      .run();
  }

  // Mark files for hidden fields as deleted
  if (validation.hiddenFieldIds.length > 0) {
    const hiddenPlaceholders = validation.hiddenFieldIds.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE files SET status = 'deleted' WHERE response_id = ? AND field_id IN (${hiddenPlaceholders})`
    )
      .bind(resp.id, ...validation.hiddenFieldIds)
      .run();
  }

  return c.json({ success: true, updated_at: nowIso });
});
