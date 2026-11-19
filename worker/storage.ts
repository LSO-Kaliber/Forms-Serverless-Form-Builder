import type { Env } from './types';

export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename) return 'uploaded_file';
  // 1. Strip null bytes and non-printable control characters
  let clean = rawFilename.replace(/[\0\x00-\x1f\x7f]/g, '');
  // 2. Extract basename (remove any directory path components like ../ or /)
  clean = clean.replace(/^.*[\\\/]/, '');
  // 3. Remove consecutive dots that could form path traversal
  clean = clean.replace(/\.\.+/g, '.');
  // 4. Trim leading dots or hyphens
  clean = clean.replace(/^[.-]+/, '');
  // 5. Fallback if empty
  if (!clean.trim()) {
    clean = 'uploaded_file';
  }
  return clean.slice(0, 100);
}

export async function putFileToR2(
  storage: R2Bucket,
  key: string,
  data: ArrayBuffer,
  mime: string,
  filename: string
): Promise<void> {
  await storage.put(key, data, {
    httpMetadata: {
      contentType: mime,
      contentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    },
    customMetadata: {
      originalFilename: filename,
    },
  });
}

export async function getFileFromR2(
  storage: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  const object = await storage.get(key);
  return object;
}

export async function deleteFileFromR2(
  storage: R2Bucket,
  key: string
): Promise<void> {
  await storage.delete(key);
}

export async function deleteFilesFromR2(
  storage: R2Bucket,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;
  await storage.delete(keys);
}
