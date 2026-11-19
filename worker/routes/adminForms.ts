import { Hono } from 'hono';
import type { Env } from '../types';
import type { FormPage, FormRecord, FormSchema } from '@shared/types';
import { ERROR_CODES } from '@shared/errors';
import { isValidSlug, RESERVED_SLUGS } from '@shared/presets';
import { detectJumpCycles } from '@shared/evaluator';
import { deleteFilesFromR2 } from '../storage';

export const adminFormsRouter = new Hono<{ Bindings: Env }>();

// Check slug availability
adminFormsRouter.get('/check-slug', async (c) => {
  const slug = c.req.query('slug')?.toLowerCase() || '';
  const excludeId = c.req.query('excludeId') || '';

  if (!slug) {
    return c.json({ available: false, errorCode: ERROR_CODES.SLUG_TIDAK_VALID });
  }

  if (RESERVED_SLUGS.has(slug)) {
    return c.json({ available: false, errorCode: ERROR_CODES.SLUG_TERLARANG });
  }

  if (!isValidSlug(slug)) {
    return c.json({ available: false, errorCode: ERROR_CODES.SLUG_TIDAK_VALID });
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM forms WHERE slug = ? AND id != ?'
  )
    .bind(slug, excludeId)
    .first();

  if (existing) {
    return c.json({ available: false, errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN });
  }

  return c.json({ available: true });
});

// List all forms with response counts
adminFormsRouter.get('/forms', async (c) => {
  const query = `
    SELECT f.*, 
           COUNT(r.id) as response_count
    FROM forms f
    LEFT JOIN responses r ON f.id = r.form_id
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `;
  const result = await c.env.DB.prepare(query).all<FormRecord>();
  return c.json({ forms: result.results || [] });
});

// Get single form
adminFormsRouter.get('/forms/:id', async (c) => {
  const id = c.req.param('id');
  const form = await c.env.DB.prepare(
    `SELECT f.*, COUNT(r.id) as response_count 
     FROM forms f 
     LEFT JOIN responses r ON f.id = r.form_id 
     WHERE f.id = ?
     GROUP BY f.id`
  )
    .bind(id)
    .first<FormRecord>();

  if (!form) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  return c.json({ form });
});

// Create new form
adminFormsRouter.post('/forms', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  let { title, slug, is_template } = body;

  title = (title || 'Formulir Tanpa Judul').trim();
  slug = (slug || `form-${Date.now().toString(36)}`).trim().toLowerCase();

  if (!isValidSlug(slug)) {
    return c.json({ errorCode: ERROR_CODES.SLUG_TIDAK_VALID }, 400);
  }

  // Check unique slug
  const existing = await c.env.DB.prepare('SELECT id FROM forms WHERE slug = ?').bind(slug).first();
  if (existing) {
    return c.json({ errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN }, 400);
  }

  const id = `f_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();

  const initialSchema: FormSchema = {
    pages: [
      {
        id: `p_${crypto.randomUUID().slice(0, 8)}`,
        title: 'Halaman 1',
        description: '',
        fields: [
          {
            id: `fld_${crypto.randomUUID().slice(0, 8)}`,
            type: 'text',
            label: 'Nama Lengkap',
            required: true,
          },
        ],
      },
    ],
  };

  try {
    await c.env.DB.prepare(
      `INSERT INTO forms (
         id, slug, title, description, status, current_version, 
         closes_at, max_responses, allow_edit, unique_field_id, 
         is_template, custom_thank_you, draft_schema_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'draft', 1, NULL, NULL, 0, NULL, ?, NULL, ?, ?, ?)`
    )
      .bind(
        id,
        slug,
        title,
        '',
        is_template ? 1 : 0,
        JSON.stringify(initialSchema),
        now,
        now
      )
      .run();
  } catch (err: any) {
    if (String(err?.message || '').includes('UNIQUE') && String(err?.message || '').includes('slug')) {
      return c.json({ errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN }, 409);
    }
    throw err;
  }

  const created = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first();
  return c.json({ form: created }, 201);
});

// Update form (settings & draft schema)
adminFormsRouter.put('/forms/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const existingForm = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRecord>();
  if (!existingForm) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  const slug = (body.slug || existingForm.slug).trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return c.json({ errorCode: ERROR_CODES.SLUG_TIDAK_VALID }, 400);
  }

  // Check slug conflict with other forms
  const slugConflict = await c.env.DB.prepare('SELECT id FROM forms WHERE slug = ? AND id != ?')
    .bind(slug, id)
    .first();
  if (slugConflict) {
    return c.json({ errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN }, 400);
  }

  // If schema is provided, check for cycle detection in page jumps
  let draftSchemaJson = existingForm.draft_schema_json;
  if (body.draft_schema) {
    const schema = typeof body.draft_schema === 'string' ? JSON.parse(body.draft_schema) : body.draft_schema;
    const cycleCheck = detectJumpCycles(schema);
    if (cycleCheck.hasCycle) {
      return c.json({ errorCode: ERROR_CODES.SIKLUS_LOMPAT_HALAMAN }, 400);
    }
    draftSchemaJson = JSON.stringify(schema);
  }

  const now = new Date().toISOString();
  const title = body.title !== undefined ? body.title : existingForm.title;
  const description = body.description !== undefined ? body.description : existingForm.description;
  const closes_at = body.closes_at !== undefined ? body.closes_at : existingForm.closes_at;
  const max_responses = body.max_responses !== undefined ? body.max_responses : existingForm.max_responses;
  const allow_edit = body.allow_edit !== undefined ? (body.allow_edit ? 1 : 0) : existingForm.allow_edit;
  const unique_field_id = body.unique_field_id !== undefined ? body.unique_field_id : existingForm.unique_field_id;
  const is_template = body.is_template !== undefined ? (body.is_template ? 1 : 0) : existingForm.is_template;
  const custom_thank_you = body.custom_thank_you !== undefined ? body.custom_thank_you : existingForm.custom_thank_you;

  try {
    await c.env.DB.prepare(
      `UPDATE forms SET
         slug = ?, title = ?, description = ?, closes_at = ?,
         max_responses = ?, allow_edit = ?, unique_field_id = ?,
         is_template = ?, custom_thank_you = ?, draft_schema_json = ?,
         updated_at = ?
       WHERE id = ?`
    )
      .bind(
        slug,
        title,
        description,
        closes_at,
        max_responses,
        allow_edit,
        unique_field_id,
        is_template,
        custom_thank_you,
        draftSchemaJson,
        now,
        id
      )
      .run();
  } catch (err: any) {
    if (String(err?.message || '').includes('UNIQUE') && String(err?.message || '').includes('slug')) {
      return c.json({ errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN }, 409);
    }
    throw err;
  }

  const updated = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first();
  return c.json({ form: updated });
});

// Publish form: snapshot schema into form_versions and set status = 'published'
adminFormsRouter.post('/forms/:id/publish', async (c) => {
  const id = c.req.param('id');
  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRecord>();
  if (!form) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  const schema = JSON.parse(form.draft_schema_json);
  const cycleCheck = detectJumpCycles(schema);
  if (cycleCheck.hasCycle) {
    return c.json({ errorCode: ERROR_CODES.SIKLUS_LOMPAT_HALAMAN }, 400);
  }

  const now = new Date().toISOString();
  // If already has published versions, increment current_version
  const latestVersion = await c.env.DB.prepare(
    'SELECT MAX(version) as max_v FROM form_versions WHERE form_id = ?'
  )
    .bind(id)
    .first<{ max_v: number | null }>();

  const nextVersion = (latestVersion?.max_v ?? 0) + 1;

  // Insert snapshot to form_versions
  await c.env.DB.prepare(
    'INSERT INTO form_versions (form_id, version, schema_json, published_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id, nextVersion, form.draft_schema_json, now)
    .run();

  // Update form status and current_version
  await c.env.DB.prepare(
    'UPDATE forms SET status = "published", current_version = ?, updated_at = ? WHERE id = ?'
  )
    .bind(nextVersion, now, id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first();
  return c.json({ form: updated });
});

// Unpublish form (revert status to 'draft')
adminFormsRouter.post('/forms/:id/unpublish', async (c) => {
  const id = c.req.param('id');
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE forms SET status = "draft", updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
  return c.json({ success: true });
});

// Close form
adminFormsRouter.post('/forms/:id/close', async (c) => {
  const id = c.req.param('id');
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE forms SET status = "closed", updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
  return c.json({ success: true });
});

// Reopen form
adminFormsRouter.post('/forms/:id/reopen', async (c) => {
  const id = c.req.param('id');
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE forms SET status = "published", updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
  return c.json({ success: true });
});

// Duplicate form (or create form from template)
adminFormsRouter.post('/forms/:id/duplicate', async (c) => {
  const sourceId = c.req.param('id');
  const source = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(sourceId).first<FormRecord>();
  if (!source) {
    return c.json({ errorCode: ERROR_CODES.FORM_TIDAK_DITEMUKAN }, 404);
  }

  const newId = `f_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const baseSlug = `${source.slug}-salinan`.slice(0, 30);
  let newSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

  // Ensure unique non-colliding slug for duplicate
  for (let i = 0; i < 5; i++) {
    const exists = await c.env.DB.prepare('SELECT id FROM forms WHERE slug = ?').bind(newSlug).first();
    if (!exists) break;
    newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO forms (
         id, slug, title, description, status, current_version, 
         closes_at, max_responses, allow_edit, unique_field_id, 
         is_template, custom_thank_you, draft_schema_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        newSlug,
        `${source.title} (Salinan)`,
        source.description,
        source.closes_at,
        source.max_responses,
        source.allow_edit ? 1 : 0,
        source.unique_field_id,
        source.custom_thank_you,
        source.draft_schema_json,
        now,
        now
      )
      .run();

    const duplicated = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(newId).first();
    return c.json({ form: duplicated }, 201);
  } catch (err: any) {
    if (String(err?.message || '').includes('UNIQUE') && String(err?.message || '').includes('slug')) {
      return c.json({ errorCode: ERROR_CODES.SLUG_SUDAH_DIGUNAKAN }, 409);
    }
    throw err;
  }
});

// Delete form: delete files in R2 and form row
adminFormsRouter.delete('/forms/:id', async (c) => {
  const id = c.req.param('id');

  // Find all file keys
  const files = await c.env.DB.prepare('SELECT r2_key FROM files WHERE form_id = ?').bind(id).all<{ r2_key: string }>();
  const keys = (files.results || []).map((f) => f.r2_key).filter(Boolean);
  if (keys.length > 0) {
    await deleteFilesFromR2(c.env.STORAGE, keys);
  }

  // Delete form (cascades to responses, form_versions, and files in SQLite)
  await c.env.DB.prepare('DELETE FROM forms WHERE id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM responses WHERE form_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM form_versions WHERE form_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM files WHERE form_id = ?').bind(id).run();

  return c.json({ success: true });
});
