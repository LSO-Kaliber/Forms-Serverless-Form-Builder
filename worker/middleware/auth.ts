import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { parseCookies, verifySessionToken } from '../auth';
import { ERROR_CODES } from '@shared/errors';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const cookieHeader = c.req.header('cookie') || null;
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['auth_session'];
  const sitePassword = c.env.SITE_PASSWORD || '';

  if (!sessionToken || !sitePassword) {
    return c.json({ errorCode: ERROR_CODES.UNAUTHORIZED }, 401);
  }

  const isValid = await verifySessionToken(sessionToken, sitePassword);
  if (!isValid) {
    return c.json({ errorCode: ERROR_CODES.UNAUTHORIZED }, 401);
  }

  await next();
}

export async function originCheckMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const method = c.req.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = c.req.header('origin');
    const referer = c.req.header('referer');
    const source = origin || referer;

    if (!source) {
      return c.json({ errorCode: ERROR_CODES.ORIGIN_TIDAK_VALID }, 403);
    }

    try {
      const reqUrl = new URL(c.req.url);
      const sourceUrl = new URL(source);
      if (reqUrl.host !== sourceUrl.host) {
        return c.json({ errorCode: ERROR_CODES.ORIGIN_TIDAK_VALID }, 403);
      }
    } catch {
      return c.json({ errorCode: ERROR_CODES.ORIGIN_TIDAK_VALID }, 403);
    }
  }

  await next();
}
