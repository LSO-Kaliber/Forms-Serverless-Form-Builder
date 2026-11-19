-- Migration 0002_add_unique_idempotency.sql
-- Ensure idempotency-key deduplication is race-safe at the database layer.
-- A UNIQUE index on (form_id, idempotency_key) prevents duplicate responses
-- from concurrent submit requests sharing the same idempotency key.
-- NULL idempotency_key values are allowed to repeat (SQLite UNIQUE semantics).
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_idempotency_unique
  ON responses(form_id, idempotency_key);
