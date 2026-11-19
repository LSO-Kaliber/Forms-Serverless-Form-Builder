-- Migration 0001_init.sql
CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    current_version INTEGER NOT NULL DEFAULT 1,
    closes_at TEXT,
    max_responses INTEGER,
    allow_edit INTEGER NOT NULL DEFAULT 0,
    unique_field_id TEXT,
    is_template INTEGER NOT NULL DEFAULT 0,
    custom_thank_you TEXT,
    draft_schema_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS form_versions (
    form_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    schema_json TEXT NOT NULL,
    published_at TEXT NOT NULL,
    PRIMARY KEY (form_id, version),
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    form_version INTEGER NOT NULL,
    data_json TEXT NOT NULL,
    unique_key TEXT,
    edit_token_hash TEXT,
    idempotency_key TEXT,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (form_id, unique_key),
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    response_id TEXT,
    form_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_is_template ON forms(is_template);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_edit_token ON responses(edit_token_hash);
CREATE INDEX IF NOT EXISTS idx_responses_idempotency ON responses(form_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_files_status_created ON files(status, created_at);
CREATE INDEX IF NOT EXISTS idx_files_response_id ON files(response_id);
