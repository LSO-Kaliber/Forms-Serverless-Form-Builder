import { describe, it, expect } from 'vitest';
import { validateFormSubmission, validateAnswerForField, FormSettingsSchema } from './validator';
import type { FormField, FormSchema } from './types';
import { ERROR_CODES } from './errors';

describe('Form Validation', () => {
  it('validates required fields', () => {
    const field: FormField = { id: 'f1', type: 'text', label: 'Nama Lengkap', required: true };
    expect(validateAnswerForField(field, '').valid).toBe(false);
    expect(validateAnswerForField(field, '').errorCode).toBe(ERROR_CODES.FIELD_WAJIB_KOSONG);
    expect(validateAnswerForField(field, 'Rico').valid).toBe(true);
  });

  it('validates NIM UMM and Webmail fields', () => {
    const nimField: FormField = { id: 'nim', type: 'nim_umm', label: 'NIM', required: true };
    expect(validateAnswerForField(nimField, '12345').valid).toBe(false);
    expect(validateAnswerForField(nimField, '202210040311004').valid).toBe(true);

    const emailField: FormField = { id: 'email', type: 'email_umm', label: 'Email UMM', required: true };
    expect(validateAnswerForField(emailField, 'test@gmail.com').valid).toBe(false);
    expect(validateAnswerForField(emailField, 'test@webmail.umm.ac.id').valid).toBe(true);
  });

  it('validates link field with allowed domains', () => {
    const linkField: FormField = {
      id: 'repo',
      type: 'link',
      label: 'Repository',
      required: true,
      validation: { allowedDomains: ['github.com', 'gitlab.com'] },
    };
    expect(validateAnswerForField(linkField, 'https://github.com/kaliber/forms').valid).toBe(true);
    expect(validateAnswerForField(linkField, 'https://bitbucket.org/kaliber').valid).toBe(false);
    expect(validateAnswerForField(linkField, 'not a url').valid).toBe(false);
  });

  it('validates full submission and skips hidden fields', () => {
    const schema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Halaman 1',
          fields: [
            { id: 'role', type: 'radio', label: 'Peran', required: true, options: [{ id: 'o1', label: 'Mahasiswa', value: 'mhs' }, { id: 'o2', label: 'Umum', value: 'umum' }] },
            {
              id: 'nim',
              type: 'nim_umm',
              label: 'NIM',
              required: true,
              visibleIf: { logicalOperator: 'AND', conditions: [{ fieldId: 'role', operator: 'eq', value: 'mhs' }] },
            },
          ],
        },
      ],
    };

    // If role is 'umum', nim is hidden so it shouldn't fail required check even if empty
    const resultUmum = validateFormSubmission(schema, { role: 'umum' });
    expect(resultUmum.valid).toBe(true);
    expect(resultUmum.cleanedAnswers).toEqual({ role: 'umum' });

    // If role is 'mhs', nim is visible and required -> should fail if missing
    const resultMhsMissing = validateFormSubmission(schema, { role: 'mhs' });
    expect(resultMhsMissing.valid).toBe(false);
    expect(resultMhsMissing.errors.nim.errorCode).toBe(ERROR_CODES.FIELD_WAJIB_KOSONG);

    // If role is 'mhs' and valid NIM provided
    const resultMhsValid = validateFormSubmission(schema, { role: 'mhs', nim: '202210040311004' });
    expect(resultMhsValid.valid).toBe(true);
  });

  it('validates form settings schema', () => {
    const valid = {
      title: 'Open Recruitment Kaliber 2026',
      slug: 'oprec-kaliber-2026',
      description: 'Pendaftaran anggota baru',
      status: 'draft',
      max_responses: 100,
      closes_at: '2026-12-31T23:59:59.000Z',
      allow_edit: true,
    };
    expect(FormSettingsSchema.safeParse(valid).success).toBe(true);

    const invalidSlug = { ...valid, slug: 'admin' };
    expect(FormSettingsSchema.safeParse(invalidSlug).success).toBe(false);
  });
});
