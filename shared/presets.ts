export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'assets',
  'e',
  'public',
  'static',
  'forms',
  'health',
  'app',
  'dashboard',
  'auth',
  'undefined',
  'null',
]);

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 40) return false;
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return false;
  return SLUG_REGEX.test(slug);
}

export const NIM_UMM_REGEX = /^\d{15}$/;

export function validateNimUmm(nim: string): boolean {
  if (typeof nim !== 'string') return false;
  const clean = nim.trim();
  return NIM_UMM_REGEX.test(clean);
}

export function normalizeNimUmm(nim: string): string {
  return (nim || '').trim();
}

export const EMAIL_WEBMAIL_UMM_REGEX = /^[^\s@]+@webmail\.umm\.ac\.id$/;

export function validateEmailWebmailUmm(email: string): boolean {
  if (typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return EMAIL_WEBMAIL_UMM_REGEX.test(clean);
}

export function normalizeEmailWebmailUmm(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isSafeRegex(pattern: string): { valid: boolean; error?: string } {
  if (!pattern) {
    return { valid: false, error: 'Pola regex tidak boleh kosong.' };
  }
  if (pattern.length > 150) {
    return { valid: false, error: 'Panjang pola regex maksimal 150 karakter.' };
  }
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
    return { valid: false, error: 'Pola regex wajib diawali ^ dan diakhiri $ (anchored).' };
  }

  // Check for common ReDoS risk patterns (nested quantifiers like (a+)+, (.*)+, (\d+)*, consecutive quantifiers, etc.)
  const nestedQuantifier = /\([^)]*(\+|\*|\{\d+,?\d*\})[^)]*\)\s*(\+|\*|\{\d+,?\d*\})/;
  const consecutiveQuantifiers = /(\+|\*|\{\d+,?\d*\})\s*(\+|\*|\{\d+,?\d*\})/;
  if (nestedQuantifier.test(pattern) || consecutiveQuantifiers.test(pattern)) {
    return { valid: false, error: 'Pola regex berpotensi mengalami ReDoS (nested repetition tidak diizinkan).' };
  }

  try {
    new RegExp(pattern);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Sintaks ekspresi reguler (regex) tidak valid.' };
  }
}

export const ALLOWED_MIME_TYPES: Record<string, { extensions: string[]; magicByteCheck: (bytes: Uint8Array) => boolean }> = {
  'image/jpeg': {
    extensions: ['jpg', 'jpeg'],
    magicByteCheck: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extensions: ['png'],
    magicByteCheck: (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  'image/webp': {
    extensions: ['webp'],
    magicByteCheck: (bytes) =>
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 && // 'RIFF'
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50, // 'WEBP'
  },
  'image/gif': {
    extensions: ['gif'],
    magicByteCheck: (bytes) =>
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61, // 'GIF87a' or 'GIF89a'
  },
  'application/pdf': {
    extensions: ['pdf'],
    magicByteCheck: (bytes) =>
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46, // '%PDF'
  },
  'application/zip': {
    extensions: ['zip'],
    magicByteCheck: (bytes) =>
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
        (bytes[2] === 0x05 && bytes[3] === 0x06) ||
        (bytes[2] === 0x07 && bytes[3] === 0x08)), // 'PK..'
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['docx'],
    magicByteCheck: (bytes) =>
      bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04,
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['xlsx'],
    magicByteCheck: (bytes) =>
      bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04,
  },
};

export function verifyMagicBytes(bytes: Uint8Array, extension: string, mime: string): boolean {
  const ext = extension.toLowerCase().replace('.', '');

  // Reject SVG and HTML explicitly
  if (['svg', 'html', 'htm', 'xml', 'js', 'php', 'exe', 'sh', 'bat'].includes(ext)) {
    return false;
  }
  if (mime.includes('svg') || mime.includes('html') || mime.includes('xml')) {
    return false;
  }

  // Find checker
  for (const [expectedMime, rule] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (rule.extensions.includes(ext) || expectedMime === mime) {
      if (rule.magicByteCheck(bytes)) {
        return true;
      }
    }
  }

  return false;
}
