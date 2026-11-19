import type { AuthSession, Env, RateLimiterBinding } from './types';

export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length, 1);
  const padA = new Uint8Array(maxLen);
  const padB = new Uint8Array(maxLen);
  padA.set(bufA);
  padB.set(bufB);

  // Equal-length constant time comparison
  const contentMatch = crypto.subtle.timingSafeEqual(padA, padB);
  const lengthMatch = (bufA.length ^ bufB.length) === 0;

  return contentMatch && lengthMatch;
}

export async function getHmacKey(sitePassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(sitePassword),
    'HKDF',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode('kaliber-form-builder-session-salt-v1'),
      info: enc.encode('kaliber-admin-session-signing-key'),
    },
    baseKey,
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(sitePassword: string): Promise<string> {
  const key = await getHmacKey(sitePassword);
  const now = Date.now();
  const session: AuthSession = {
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000, // 7 days validity
    v: 1,
  };
  const jsonStr = JSON.stringify(session);
  const dataB64 = btoa(jsonStr);
  const dataBytes = new TextEncoder().encode(dataB64);
  const signature = await crypto.subtle.sign('HMAC', key, dataBytes);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${dataB64}.${sigB64}`;
}

export async function verifySessionToken(token: string, sitePassword: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [dataB64, sigB64] = parts;

  try {
    const key = await getHmacKey(sitePassword);
    const dataBytes = new TextEncoder().encode(dataB64);
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    if (!valid) return false;

    const session: AuthSession = JSON.parse(atob(dataB64));
    if (Date.now() > session.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkRateLimit(
  limiter: RateLimiterBinding | undefined,
  key: string
): Promise<boolean> {
  if (!limiter) return true;
  try {
    const res = await limiter.limit({ key });
    return res.success;
  } catch {
    return true;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

export function buildSessionCookieHeader(token: string, maxAgeSeconds: number = 7 * 24 * 3600): string {
  return `auth_session=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function buildClearCookieHeader(): string {
  return `auth_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function hashSha256(value: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateEditToken(): string {
  // >= 128 bit (16 bytes = 128 bits, let's use 32 bytes = 256 bits for supreme security)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
