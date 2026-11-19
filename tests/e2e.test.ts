import { describe, it, expect } from 'vitest';
import type { FormSchema } from '../shared/types';
import { ERROR_CODES } from '../shared/errors';

const BASE_URL = 'http://127.0.0.1:8787';

describe('End-to-End System Integration Tests', () => {
  let authCookie = '';
  let formId = '';
  let nimFieldId = 'fld_nim';
  let roleFieldId = 'fld_role';
  let fileFieldId = 'fld_file';
  let uploadedFileId = '';
  let editToken = '';
  let responseId = '';

  it('1. Login with invalid password returns 401 PASSWORD_SALAH', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password_xyz' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.errorCode).toBe(ERROR_CODES.PASSWORD_SALAH);
  });

  it('2. Login with valid password sets signed HMAC cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'kaliber_secret_password_123' }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeTruthy();
    expect(cookie).toContain('auth_session=');
    authCookie = cookie!.split(';')[0];
  });

  it('3. Auth check endpoint returns authenticated: true', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
  });

  it('4. Create new form in draft status', async () => {
    const slug = `e2e-test-form-${Date.now().toString(36)}`;
    const res = await fetch(`${BASE_URL}/api/admin/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        title: 'Formulir Uji Integrasi Kaliber',
        slug,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.form).toBeTruthy();
    expect(data.form.status).toBe('draft');
    formId = data.form.id;
  });

  it('5. Check real-time slug availability', async () => {
    // Reserved slug
    const resReserved = await fetch(`${BASE_URL}/api/admin/check-slug?slug=admin`, {
      headers: { Cookie: authCookie },
    });
    const dataReserved = await resReserved.json();
    expect(dataReserved.available).toBe(false);
    expect(dataReserved.errorCode).toBe(ERROR_CODES.SLUG_TERLARANG);

    // Free slug
    const resFree = await fetch(`${BASE_URL}/api/admin/check-slug?slug=slug-sangat-bebas-123`, {
      headers: { Cookie: authCookie },
    });
    const dataFree = await resFree.json();
    expect(dataFree.available).toBe(true);
  });

  it('6. Cycle detection rejects cyclic page jump rules', async () => {
    const cyclicSchema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Halaman 1',
          fields: [],
          pageJumpRules: [
            {
              id: 'j1',
              conditionGroup: { logicalOperator: 'AND', conditions: [] },
              targetPageId: 'p2',
            },
          ],
        },
        {
          id: 'p2',
          title: 'Halaman 2',
          fields: [],
          pageJumpRules: [
            {
              id: 'j2',
              conditionGroup: { logicalOperator: 'AND', conditions: [] },
              targetPageId: 'p1',
            },
          ],
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        draft_schema: cyclicSchema,
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errorCode).toBe(ERROR_CODES.SIKLUS_LOMPAT_HALAMAN);
  });

  it('7. Update form with valid branching schema and settings', async () => {
    const validSchema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Informasi Diri',
          fields: [
            {
              id: roleFieldId,
              type: 'radio',
              label: 'Status Pendaftar',
              required: true,
              options: [
                { id: 'o1', label: 'Mahasiswa UMM', value: 'mhs' },
                { id: 'o2', label: 'Umum / Lainnya', value: 'umum' },
              ],
            },
            {
              id: nimFieldId,
              type: 'nim_umm',
              label: 'NIM Mahasiswa',
              required: true,
              visibleIf: {
                logicalOperator: 'AND',
                conditions: [{ fieldId: roleFieldId, operator: 'eq', value: 'mhs' }],
              },
            },
            {
              id: fileFieldId,
              type: 'file',
              label: 'Bukti KTM',
              required: false,
              visibleIf: {
                logicalOperator: 'AND',
                conditions: [{ fieldId: roleFieldId, operator: 'eq', value: 'mhs' }],
              },
            },
          ],
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        draft_schema: validSchema,
        unique_field_id: nimFieldId,
        allow_edit: true,
        max_responses: null,
      }),
    });
    expect(res.status).toBe(200);
  });

  it('8. Publish form creates snapshot in form_versions', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/forms/${formId}/publish`, {
      method: 'POST',
      headers: { Cookie: authCookie, Origin: BASE_URL },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.form.status).toBe('published');
    expect(data.form.current_version).toBe(1);
  });

  it('9. File upload: rejects fake HTML/SVG, rejects >3MB, accepts valid PNG', async () => {
    const formGet = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      headers: { Cookie: authCookie },
    });
    const { form } = await formGet.json();

    // A. Reject HTML/SVG disguised as png
    const fakeHtml = new Blob(['<script>alert(1)</script>'], { type: 'text/html' });
    const fakeFormData = new FormData();
    fakeFormData.append('file', fakeHtml, 'danger.html');
    fakeFormData.append('fieldId', fileFieldId);

    const resFake = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/upload`, {
      method: 'POST',
      body: fakeFormData,
    });
    expect(resFake.status).toBe(400);
    const dataFake = await resFake.json();
    expect(dataFake.errorCode).toBe(ERROR_CODES.MAGIC_BYTES_TIDAK_VALID);

    // B. Reject oversized (> 3MB)
    const bigBytes = new Uint8Array(3.5 * 1024 * 1024);
    const bigBlob = new Blob([bigBytes], { type: 'application/pdf' });
    const bigFormData = new FormData();
    bigFormData.append('file', bigBlob, 'large.pdf');
    bigFormData.append('fieldId', fileFieldId);

    const resBig = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/upload`, {
      method: 'POST',
      body: bigFormData,
    });
    expect(resBig.status).toBe(400);
    const dataBig = await resBig.json();
    expect(dataBig.errorCode).toBe(ERROR_CODES.FILE_TERLALU_BESAR);

    // C. Accept valid PNG with magic bytes
    const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
    const validBlob = new Blob([validPngBytes], { type: 'image/png' });
    const validFormData = new FormData();
    validFormData.append('file', validBlob, 'ktm.png');
    validFormData.append('fieldId', fileFieldId);

    const resValid = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/upload`, {
      method: 'POST',
      body: validFormData,
    });
    expect(resValid.status).toBe(201);
    const dataValid = await resValid.json();
    expect(dataValid.file).toBeTruthy();
    expect(dataValid.file.id).toBeTruthy();
    uploadedFileId = dataValid.file.id;
  });

  it('10. Submit initial response with valid NIM', async () => {
    const formGet = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      headers: { Cookie: authCookie },
    });
    const { form } = await formGet.json();

    const res = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          [roleFieldId]: 'mhs',
          [nimFieldId]: '202210040311004',
          [fileFieldId]: { id: uploadedFileId, filename: 'ktm.png' },
        },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.responseId).toBeTruthy();
    expect(data.editToken).toBeTruthy();
    responseId = data.responseId;
    editToken = data.editToken;
  });

  it('11. Duplicate NIM is rejected with NIM_SUDAH_TERDAFTAR', async () => {
    const formGet = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      headers: { Cookie: authCookie },
    });
    const { form } = await formGet.json();

    const res = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          [roleFieldId]: 'mhs',
          [nimFieldId]: ' 202210040311004 ', // Same NIM with whitespace
        },
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errorCode).toBe(ERROR_CODES.NIM_SUDAH_TERDAFTAR);
  });

  it('12. Quota check: rejects new submissions when max_responses reached', async () => {
    // Set max_responses = 1
    await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        Origin: BASE_URL,
      },
      body: JSON.stringify({ max_responses: 1 }),
    });

    const formGet = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      headers: { Cookie: authCookie },
    });
    const { form } = await formGet.json();

    // Submit with another NIM
    const res = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          [roleFieldId]: 'mhs',
          [nimFieldId]: '202210040311005',
        },
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errorCode).toBe(ERROR_CODES.KUOTA_PENUH);
  });

  it('13. Form closed: rejects submissions when closed', async () => {
    // Close form
    await fetch(`${BASE_URL}/api/admin/forms/${formId}/close`, {
      method: 'POST',
      headers: { Cookie: authCookie, Origin: BASE_URL },
    });

    const formGet = await fetch(`${BASE_URL}/api/admin/forms/${formId}`, {
      headers: { Cookie: authCookie },
    });
    const { form } = await formGet.json();

    const res = await fetch(`${BASE_URL}/api/public/forms/${form.slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          [roleFieldId]: 'umum',
        },
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errorCode).toBe(ERROR_CODES.FORM_DITUTUP);

    // Reopen form
    await fetch(`${BASE_URL}/api/admin/forms/${formId}/reopen`, {
      method: 'POST',
      headers: { Cookie: authCookie, Origin: BASE_URL },
    });
  });

  it('14. Edit response via edit token', async () => {
    // A. Fetch existing response
    const resGet = await fetch(`${BASE_URL}/api/public/edit/${editToken}`);
    expect(resGet.status).toBe(200);
    const dataGet = await resGet.json();
    expect(dataGet.answers[roleFieldId]).toBe('mhs');

    // B. Update answers (change role to 'umum', which hides NIM and file)
    const resPut = await fetch(`${BASE_URL}/api/public/edit/${editToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          [roleFieldId]: 'umum',
        },
      }),
    });
    expect(resPut.status).toBe(200);

    // Verify hidden fields were pruned
    const resVerify = await fetch(`${BASE_URL}/api/public/edit/${editToken}`);
    const dataVerify = await resVerify.json();
    expect(dataVerify.answers[roleFieldId]).toBe('umum');
    expect(dataVerify.answers[fileFieldId]).toBeUndefined();
  });

  it('15. Admin responses list, regenerate token, and hard delete response', async () => {
    // List responses
    const resList = await fetch(`${BASE_URL}/api/admin/forms/${formId}/responses`, {
      headers: { Cookie: authCookie },
    });
    expect(resList.status).toBe(200);
    const dataList = await resList.json();
    expect(dataList.responses.length).toBeGreaterThan(0);

    // Regenerate token
    const resRegen = await fetch(`${BASE_URL}/api/admin/responses/${responseId}/regenerate-token`, {
      method: 'POST',
      headers: { Cookie: authCookie, Origin: BASE_URL },
    });
    expect(resRegen.status).toBe(200);
    const dataRegen = await resRegen.json();
    expect(dataRegen.newToken).toBeTruthy();
    expect(dataRegen.newToken).not.toBe(editToken);

    // Old token should be invalid now
    const resOldToken = await fetch(`${BASE_URL}/api/public/edit/${editToken}`);
    expect(resOldToken.status).toBe(404);

    // New token works
    const resNewToken = await fetch(`${BASE_URL}/api/public/edit/${dataRegen.newToken}`);
    expect(resNewToken.status).toBe(200);

    // Hard delete response
    const resDel = await fetch(`${BASE_URL}/api/admin/responses/${responseId}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie, Origin: BASE_URL },
    });
    expect(resDel.status).toBe(200);

    // Verify list is empty
    const resListAfter = await fetch(`${BASE_URL}/api/admin/forms/${formId}/responses`, {
      headers: { Cookie: authCookie },
    });
    const dataListAfter = await resListAfter.json();
    expect(dataListAfter.responses.length).toBe(0);
  });
});
