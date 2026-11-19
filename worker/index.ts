import { Hono } from 'hono';
import type { Env } from './types';
import { authMiddleware, originCheckMiddleware } from './middleware/auth';
import { authRouter } from './routes/auth';
import { adminFormsRouter } from './routes/adminForms';
import { adminResponsesRouter } from './routes/adminResponses';
import { publicFormsRouter } from './routes/publicForms';
import { filesRouter } from './routes/files';
import { handleCronTrigger } from './cron';

const app = new Hono<{ Bindings: Env }>();

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// Public authentication routes
app.route('/api/auth', authRouter);

// Protected admin routes (auth + CSRF check)
app.use('/api/admin', authMiddleware);
app.use('/api/admin/*', authMiddleware);
app.use('/api/admin', originCheckMiddleware);
app.use('/api/admin/*', originCheckMiddleware);
app.route('/api/admin', adminFormsRouter);
app.route('/api/admin', adminResponsesRouter);
app.route('/api', filesRouter); // Handles /api/admin/files/:id and /api/public/files/:id

// Public form routes
app.route('/api/public', publicFormsRouter);

// Centralized error handler: never leak stack traces or internal secrets
app.onError((err, c) => {
  console.error('[UNHANDLED_ERROR]', err?.message || err);
  return c.json({ errorCode: 'TERJADI_KESALAHAN' }, 500);
});

// Fallback to static assets for non-API routes (SPA routing)
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ errorCode: 'FORM_TIDAK_DITEMUKAN' }, 404);
  }
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleCronTrigger(env));
  },
};
