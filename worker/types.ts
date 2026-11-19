export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ASSETS?: Fetcher;
  LOGIN_LIMITER?: RateLimiterBinding;
  SUBMIT_LIMITER?: RateLimiterBinding;
  UPLOAD_LIMITER?: RateLimiterBinding;
  SITE_PASSWORD?: string;
  TURNSTILE_SECRET?: string;
  ENVIRONMENT?: string;
}

export interface AuthSession {
  iat: number;
  exp: number;
  v: number;
}
