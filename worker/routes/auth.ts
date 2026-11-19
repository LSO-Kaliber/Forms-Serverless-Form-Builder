import { Hono } from 'hono';
import type { Env } from '../types';
import {
  timingSafeEqualStrings,
  createSessionToken,
  buildSessionCookieHeader,
  buildClearCookieHeader,
  checkRateLimit,
  parseCookies,
  verifySessionToken,
} from '../auth';
import { ERROR_CODES } from '@shared/errors';

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.post('/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  // Rate limit login
  const allowed = await checkRateLimit(c.env.LOGIN_LIMITER, `login:${ip}`);
  if (!allowed) {
    return c.json({ errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const password = body.password || '';
  const sitePassword = c.env.SITE_PASSWORD || '';

  if (!sitePassword) {
    console.error('[AUTH] SITE_PASSWORD belum dikonfigurasi di environment!');
    return c.json({ errorCode: ERROR_CODES.TERJADI_KESALAHAN }, 500);
  }

  const isMatch = timingSafeEqualStrings(password, sitePassword);
  if (!isMatch) {
    return c.json({ errorCode: ERROR_CODES.PASSWORD_SALAH }, 401);
  }

  const token = await createSessionToken(sitePassword);
  const cookieHeader = buildSessionCookieHeader(token);

  c.header('Set-Cookie', cookieHeader);
  return c.json({ success: true });
});

authRouter.post('/logout', async (c) => {
  c.header('Set-Cookie', buildClearCookieHeader());
  return c.json({ success: true });
});

authRouter.get('/me', async (c) => {
  const cookieHeader = c.req.header('cookie') || null;
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['auth_session'];
  const sitePassword = c.env.SITE_PASSWORD || '';

  if (!sessionToken || !sitePassword) {
    return c.json({ authenticated: false });
  }

  const isValid = await verifySessionToken(sessionToken, sitePassword);
  return c.json({ authenticated: isValid });
});
