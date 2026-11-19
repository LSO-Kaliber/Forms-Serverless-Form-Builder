import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FieldType, FormField, FormPage, FormRecord, FormSchema, PageJumpRule } from '@shared/types';
import { getErrorMessage } from '@shared/errors';
import { detectJumpCycles } from '@shared/evaluator';

export const useFormBuilderStore = defineStore('formBuilder', () => {
  const currentForm = ref<FormRecord | null>(null);
  const schema = ref<FormSchema>({ pages: [] });
  const activePageId = ref<string>('');
  const activeFieldId = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string>('');
  const successMessage = ref<string>('');

  async function loadForm(id: string): Promise<boolean> {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const res = await fetch(`/api/admin/forms/${id}`);
      if (!res.ok) {
        const data = await res.json();
        errorMessage.value = getErrorMessage(data.errorCode);
        return false;
      }
      const data = await res.json();
      currentForm.value = data.form;

      try {
        schema.value = JSON.parse(data.form.draft_schema_json);
      } catch {
        schema.value = { pages: [] };
      }

      if (schema.value.pages.length > 0) {
        activePageId.value = schema.value.pages[0].id;
      }
      return true;
    } catch {
      errorMessage.value = 'Gagal memuat formulir dari server.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function addPage(): FormPage {
    const newPage: FormPage = {
      id: `p_${crypto.randomUUID().slice(0, 8)}`,
      title: `Halaman ${schema.value.pages.length + 1}`,
      description: '',
      fields: [],
      pageJumpRules: [],
    };
    schema.value.pages.push(newPage);
    activePageId.value = newPage.id;
    return newPage;
  }

  function deletePage(pageId: string) {
    if (schema.value.pages.length <= 1) {
      errorMessage.value = 'Formulir harus memiliki minimal 1 halaman.';
      return;
    }
    schema.value.pages = schema.value.pages.filter((p) => p.id !== pageId);
    if (activePageId.value === pageId && schema.value.pages.length > 0) {
      activePageId.value = schema.value.pages[0].id;
    }
  }

  function addField(pageId: string, type: FieldType): FormField {
    const page = schema.value.pages.find((p) => p.id === pageId);
    if (!page) throw new Error('Halaman tidak ditemukan');

    const defaultLabels: Record<FieldType, string> = {
      text: 'Pertanyaan Teks Singkat',
      paragraph: 'Pertanyaan Paragraf',
      number: 'Pertanyaan Angka',
      email: 'Alamat Email',
      nim_umm: 'NIM UMM (15 Digit)',
      email_umm: 'Email Webmail UMM',
      custom_regex: 'Pertanyaan Pola Kustom',
      radio: 'Pilihan Tunggal',
      checkbox: 'Kotak Centang',
      dropdown: 'Pilihan Menu (Dropdown)',
      date: 'Pilih Tanggal',
      file: 'Unggah Berkas Lampiran',
      link: 'Tautan / URL',
      info: 'Judul Informasi',
    };

    const newField: FormField = {
      id: `fld_${crypto.randomUUID().slice(0, 8)}`,
      type,
      label: defaultLabels[type] || 'Pertanyaan Baru',
      required: type !== 'info',
      helpText: '',
      placeholder: '',
      options: ['radio', 'checkbox', 'dropdown'].includes(type)
        ? [
            { id: `opt_${crypto.randomUUID().slice(0, 6)}`, label: 'Opsi 1', value: 'opsi_1' },
            { id: `opt_${crypto.randomUUID().slice(0, 6)}`, label: 'Opsi 2', value: 'opsi_2' },
          ]
        : undefined,
      validation: type === 'file'
        ? { maxFileSizeMB: 3, maxFileCount: 1, allowedFileTypes: ['image', 'document'] }
        : type === 'link'
        ? { allowedDomains: [] }
        : undefined,
    };

    page.fields.push(newField);
    activeFieldId.value = newField.id;
    return newField;
  }

  function duplicateField(pageId: string, fieldId: string) {
    const page = schema.value.pages.find((p) => p.id === pageId);
    if (!page) return;

    const index = page.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const source = page.fields[index];
    const copy: FormField = JSON.parse(JSON.stringify(source));
    copy.id = `fld_${crypto.randomUUID().slice(0, 8)}`;
    copy.label = `${copy.label} (Salinan)`;

    page.fields.splice(index + 1, 0, copy);
    activeFieldId.value = copy.id;
  }

  function deleteField(pageId: string, fieldId: string) {
    const page = schema.value.pages.find((p) => p.id === pageId);
    if (!page) return;

    // If form already has responses, soft delete / archive instead of hard delete
    if (currentForm.value && (currentForm.value.response_count ?? 0) > 0) {
      archiveField(pageId, fieldId);
      return;
    }

    page.fields = page.fields.filter((f) => f.id !== fieldId);
    if (activeFieldId.value === fieldId) {
      activeFieldId.value = null;
    }
  }

  function archiveField(pageId: string, fieldId: string) {
    const page = schema.value.pages.find((p) => p.id === pageId);
    if (!page) return;
    const f = page.fields.find((field) => field.id === fieldId);
    if (f) {
      f.archived = true;
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!currentForm.value) return false;
    isSaving.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    // Cycle check on page jumps
    const cycleCheck = detectJumpCycles(schema.value);
    if (cycleCheck.hasCycle) {
      errorMessage.value = 'Gagal menyimpan: Ditemukan siklus/perulangan pada aturan lompat halaman.';
      isSaving.value = false;
      return false;
    }

    try {
      const res = await fetch(`/api/admin/forms/${currentForm.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentForm.value,
          draft_schema: schema.value,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        errorMessage.value = getErrorMessage(data.errorCode);
        return false;
      }

      currentForm.value = data.form;
      successMessage.value = 'Draf formulir berhasil disimpan.';
      setTimeout(() => (successMessage.value = ''), 3000);
      return true;
    } catch {
      errorMessage.value = 'Gagal menyimpan formulir ke server.';
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function publish(): Promise<boolean> {
    if (!currentForm.value) return false;
    const draftSaved = await saveDraft();
    if (!draftSaved) return false;

    isSaving.value = true;
    errorMessage.value = '';
    try {
      const res = await fetch(`/api/admin/forms/${currentForm.value.id}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        errorMessage.value = getErrorMessage(data.errorCode);
        return false;
      }
      currentForm.value = data.form;
      successMessage.value = 'Formulir berhasil dipublikasikan!';
      setTimeout(() => (successMessage.value = ''), 4000);
      return true;
    } catch {
      errorMessage.value = 'Gagal mempublikasikan formulir.';
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function unpublish(): Promise<boolean> {
    if (!currentForm.value) return false;
    try {
      const res = await fetch(`/api/admin/forms/${currentForm.value.id}/unpublish`, {
        method: 'POST',
      });
      if (res.ok) {
        currentForm.value.status = 'draft';
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function closeForm(): Promise<boolean> {
    if (!currentForm.value) return false;
    try {
      const res = await fetch(`/api/admin/forms/${currentForm.value.id}/close`, {
        method: 'POST',
      });
      if (res.ok) {
        currentForm.value.status = 'closed';
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function reopenForm(): Promise<boolean> {
    if (!currentForm.value) return false;
    try {
      const res = await fetch(`/api/admin/forms/${currentForm.value.id}/reopen`, {
        method: 'POST',
      });
      if (res.ok) {
        currentForm.value.status = 'published';
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return {
    currentForm,
    schema,
    activePageId,
    activeFieldId,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    loadForm,
    addPage,
    deletePage,
    addField,
    duplicateField,
    deleteField,
    archiveField,
    saveDraft,
    publish,
    unpublish,
    closeForm,
    reopenForm,
  };
});
