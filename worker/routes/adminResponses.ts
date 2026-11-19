import { Hono } from 'hono';
import type { Env } from '../types';
import type { FileRecord, ResponseRecord } from '@shared/types';
import { ERROR_CODES } from '@shared/errors';
import { deleteFilesFromR2 } from '../storage';
import { generateEditToken, hashSha256 } from '../auth';

export const adminResponsesRouter = new Hono<{ Bindings: Env }>();

// Get responses for a form (paginated, default 500 per page)
adminResponsesRouter.get('/forms/:id/responses', async (c) => {
  const formId = c.req.param('id');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '500', 10), 1000);
  const offset = (page - 1) * limit;

  // Total count
  const countRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM responses WHERE form_id = ?')
    .bind(formId)
    .first<{ total: number }>();
  const total = countRes?.total ?? 0;

  // Fetch responses
  const responsesQuery = `
    SELECT id, form_id, form_version, data_json, unique_key, submitted_at, updated_at
    FROM responses
    WHERE form_id = ?
    ORDER BY submitted_at DESC
    LIMIT ? OFFSET ?
  `;
  const responses = await c.env.DB.prepare(responsesQuery)
    .bind(formId, limit, offset)
    .all<ResponseRecord>();

  // Fetch attached files for these responses
  const filesQuery = `
    SELECT id, response_id, form_id, field_id, r2_key, filename, size, mime, status, created_at
    FROM files
    WHERE form_id = ? AND status = 'attached'
  `;
  const filesRes = await c.env.DB.prepare(filesQuery).bind(formId).all<FileRecord>();
  const filesByResponse: Record<string, FileRecord[]> = {};
  for (const f of filesRes.results || []) {
    if (f.response_id) {
      if (!filesByResponse[f.response_id]) {
        filesByResponse[f.response_id] = [];
      }
      filesByResponse[f.response_id].push({
        ...f,
        download_url: `/api/admin/files/${f.id}`,
      });
    }
  }

  // Combine answers with parsed data_json and files
  const items = (responses.results || []).map((r) => {
    let parsedAnswers: Record<string, any> = {};
    try {
      parsedAnswers = JSON.parse(r.data_json);
    } catch {
      parsedAnswers = {};
    }
    return {
      ...r,
      answers: parsedAnswers,
      files: filesByResponse[r.id] || [],
    };
  });

  return c.json({
    total,
    page,
    limit,
    responses: items,
  });
});

// Delete single response
adminResponsesRouter.delete('/responses/:responseId', async (c) => {
  const responseId = c.req.param('responseId');

  const resp = await c.env.DB.prepare('SELECT id, form_id FROM responses WHERE id = ?')
    .bind(responseId)
    .first<{ id: string; form_id: string }>();

  if (!resp) {
    return c.json({ errorCode: ERROR_CODES.RESPONSE_TIDAK_DITEMUKAN }, 404);
  }

  // Delete attached files from R2
  const files = await c.env.DB.prepare('SELECT r2_key FROM files WHERE response_id = ?')
    .bind(responseId)
    .all<{ r2_key: string }>();

  const keys = (files.results || []).map((f) => f.r2_key).filter(Boolean);
  if (keys.length > 0) {
    await deleteFilesFromR2(c.env.STORAGE, keys);
  }

  // Delete DB records
  await c.env.DB.prepare('DELETE FROM files WHERE response_id = ?').bind(responseId).run();
  await c.env.DB.prepare('DELETE FROM responses WHERE id = ?').bind(responseId).run();

  return c.json({ success: true });
});

// Regenerate edit token for response
adminResponsesRouter.post('/responses/:responseId/regenerate-token', async (c) => {
  const responseId = c.req.param('responseId');

  const resp = await c.env.DB.prepare('SELECT id FROM responses WHERE id = ?')
    .bind(responseId)
    .first<{ id: string }>();

  if (!resp) {
    return c.json({ errorCode: ERROR_CODES.RESPONSE_TIDAK_DITEMUKAN }, 404);
  }

  const newToken = generateEditToken();
  const newHash = await hashSha256(newToken);
  const now = new Date().toISOString();

  await c.env.DB.prepare('UPDATE responses SET edit_token_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, now, responseId)
    .run();

  return c.json({
    success: true,
    newToken,
  });
});
