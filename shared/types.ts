export type FormStatus = 'draft' | 'published' | 'closed';

export type FieldType =
  | 'text'
  | 'paragraph'
  | 'number'
  | 'email'
  | 'nim_umm'
  | 'email_umm'
  | 'custom_regex'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'date'
  | 'file'
  | 'link'
  | 'info';

export type AllowedFileType = 'image' | 'document' | 'zip';

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export type ConditionOperator = 'eq' | 'neq' | 'contains' | 'empty' | 'notEmpty';

export interface Condition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
}

export interface ConditionGroup {
  logicalOperator: 'AND' | 'OR';
  conditions: Condition[];
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  patternError?: string;
  allowedFileTypes?: AllowedFileType[];
  maxFileSizeMB?: number;
  maxFileCount?: number;
  allowedDomains?: string[];
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  validation?: FieldValidationRules;
  visibleIf?: ConditionGroup;
  archived?: boolean;
}

export interface PageJumpRule {
  id: string;
  conditionGroup: ConditionGroup;
  targetPageId: string | 'SUBMIT';
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  visibleIf?: ConditionGroup;
  pageJumpRules?: PageJumpRule[];
}

export interface FormSchema {
  pages: FormPage[];
}

export interface FormRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: FormStatus;
  current_version: number;
  closes_at: string | null;
  max_responses: number | null;
  allow_edit: boolean;
  unique_field_id: string | null;
  is_template: boolean;
  custom_thank_you: string | null;
  draft_schema_json: string;
  created_at: string;
  updated_at: string;
  response_count?: number;
}

export interface FormVersionRecord {
  form_id: string;
  version: number;
  schema_json: string;
  published_at: string;
}

export interface ResponseRecord {
  id: string;
  form_id: string;
  form_version: number;
  data_json: string;
  unique_key: string | null;
  edit_token_hash: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  response_id: string | null;
  form_id: string;
  field_id: string;
  r2_key: string;
  filename: string;
  size: number;
  mime: string;
  status: 'pending' | 'attached' | 'deleted';
  created_at: string;
  download_url?: string;
}

export interface SubmitPayload {
  answers: Record<string, any>;
  turnstileToken?: string;
  honeypot?: string;
  idempotencyKey?: string;
}

export interface EditResponsePayload {
  answers: Record<string, any>;
}

export interface PublicFormView {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: FormStatus;
  version: number;
  schema: FormSchema;
  allow_edit: boolean;
  closes_at: string | null;
  custom_thank_you: string | null;
  unique_field_id: string | null;
  is_closed: boolean;
  is_full: boolean;
}
