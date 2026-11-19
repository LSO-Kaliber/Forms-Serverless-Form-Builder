import { Hono } from 'hono';
import type { Env } from '../types';
import type { FileRecord } from '@shared/types';
import { ERROR_CODES } from '@shared/errors';
import { getFileFromR2 } from '../storage';

export const filesRouter = new Hono<{ Bindings: Env }>();

// Protected file download for admin
filesRouter.get('/admin/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId');

  const fileRecord = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?')
    .bind(fileId)
    .first<FileRecord>();

  if (!fileRecord) {
    return c.json({ errorCode: ERROR_CODES.FILE_TIDAK_DITEMUKAN }, 404);
  }

  const r2Object = await getFileFromR2(c.env.STORAGE, fileRecord.r2_key);
  if (!r2Object) {
    return c.json({ errorCode: ERROR_CODES.FILE_TIDAK_DITEMUKAN }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', fileRecord.mime || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.filename)}"`);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Length', fileRecord.size.toString());

  return new Response(r2Object.body, {
    status: 200,
    headers,
  });
});

// Public file download (for responses where attached)
filesRouter.get('/public/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId');

  const fileRecord = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?')
    .bind(fileId)
    .first<FileRecord>();

  if (!fileRecord || fileRecord.status === 'deleted' || fileRecord.status === 'pending') {
    return c.json({ errorCode: ERROR_CODES.FILE_TIDAK_DITEMUKAN }, 404);
  }

  const r2Object = await getFileFromR2(c.env.STORAGE, fileRecord.r2_key);
  if (!r2Object) {
    return c.json({ errorCode: ERROR_CODES.FILE_TIDAK_DITEMUKAN }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', fileRecord.mime || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.filename)}"`);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Length', fileRecord.size.toString());

  return new Response(r2Object.body, {
    status: 200,
    headers,
  });
});