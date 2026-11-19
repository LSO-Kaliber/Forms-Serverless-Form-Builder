import type { Env } from './types';
import { deleteFilesFromR2 } from './storage';

export async function handleCronTrigger(env: Env): Promise<{ deletedCount: number }> {
  try {
    // 1. Find pending files older than 24 hours or files marked as deleted
    const query = `
      SELECT id, r2_key 
      FROM files 
      WHERE status = 'deleted' 
         OR (status = 'pending' AND datetime(created_at) < datetime('now', '-1 day'))
      LIMIT 100
    `;
    const res = await env.DB.prepare(query).all<{ id: string; r2_key: string }>();
    const rows = res.results || [];

    if (rows.length === 0) {
      return { deletedCount: 0 };
    }

    const r2Keys = rows.map((r) => r.r2_key).filter(Boolean);
    const fileIds = rows.map((r) => r.id);

    // 2. Delete from R2
    if (r2Keys.length > 0) {
      await deleteFilesFromR2(env.STORAGE, r2Keys);
    }

    // 3. Delete from D1
    const placeholders = fileIds.map(() => '?').join(',');
    await env.DB.prepare(`DELETE FROM files WHERE id IN (${placeholders})`).bind(...fileIds).run();

    console.log(`[CRON] Berhasil membersihkan ${fileIds.length} berkas usang/terhapus.`);
    return { deletedCount: fileIds.length };
  } catch (err) {
    console.error('[CRON] Gagal menjalankan pembersihan berkas:', err);
    return { deletedCount: 0 };
  }
}
