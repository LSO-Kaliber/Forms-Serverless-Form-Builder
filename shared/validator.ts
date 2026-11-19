import { z } from 'zod';
import type { FormField, FormSchema } from './types';
import { filterVisibleAnswersAndFiles } from './evaluator';
import {
  validateNimUmm,
  validateEmailWebmailUmm,
  isSafeRegex,
  isValidSlug,
} from './presets';
import { ERROR_CODES } from './errors';

export const FormSettingsSchema = z.object({
  title: z.string().min(1, 'Judul formulir wajib diisi').max(200, 'Judul maksimal 200 karakter'),
  slug: z.string().refine((val) => isValidSlug(val), {
    message: 'Slug tidak valid (gunakan 3-40 karakter huruf kecil, angka, dan tanda hubung, bukan reserved word)',
  }),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().default(''),
  status: z.enum(['draft', 'published', 'closed']),
  max_responses: z.number().int().positive('Kuota harus berupa angka positif').nullable().optional(),
  closes_at: z.string().datetime({ message: 'Format waktu penutupan tidak valid' }).nullable().optional(),
  allow_edit: z.boolean().default(false),
  unique_field_id: z.string().nullable().optional(),
  is_template: z.boolean().default(false),
  custom_thank_you: z.string().max(2000, 'Pesan terima kasih maksimal 2000 karakter').nullable().optional(),
});

export function validateAnswerForField(
  field: FormField,
  value: any
): { valid: boolean; errorCode?: string; errorMessage?: string } {
  // Info block requires no answer
  if (field.type === 'info') {
    return { valid: true };
  }

  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (field.required && isEmpty) {
    return {
      valid: false,
      errorCode: ERROR_CODES.FIELD_WAJIB_KOSONG,
      errorMessage: `${field.label} wajib diisi.`,
    };
  }

  if (isEmpty) {
    return { valid: true };
  }

  switch (field.type) {
    case 'text':
    case 'paragraph': {
      const str = String(value);
      if (field.validation?.min !== undefined && str.length < field.validation.min) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} minimal ${field.validation.min} karakter.`,
        };
      }
      if (field.validation?.max !== undefined && str.length > field.validation.max) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} maksimal ${field.validation.max} karakter.`,
        };
      }
      return { valid: true };
    }

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} harus berupa angka yang valid.`,
        };
      }
      if (field.validation?.min !== undefined && num < field.validation.min) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} minimal bernilai ${field.validation.min}.`,
        };
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} maksimal bernilai ${field.validation.max}.`,
        };
      }
      return { valid: true };
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value).trim())) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: 'Format alamat email tidak valid.',
        };
      }
      return { valid: true };
    }

    case 'nim_umm': {
      if (!validateNimUmm(String(value))) {
        return {
          valid: false,
          errorCode: ERROR_CODES.NIM_TIDAK_VALID,
          errorMessage: 'Format NIM UMM harus 15 digit angka (contoh: 202210040311004).',
        };
      }
      return { valid: true };
    }

    case 'email_umm': {
      if (!validateEmailWebmailUmm(String(value))) {
        return {
          valid: false,
          errorCode: ERROR_CODES.EMAIL_UMM_TIDAK_VALID,
          errorMessage: 'Harus menggunakan email resmi UMM (@webmail.umm.ac.id).',
        };
      }
      return { valid: true };
    }

    case 'custom_regex': {
      const pattern = field.validation?.pattern;
      if (pattern) {
        const safeCheck = isSafeRegex(pattern);
        if (!safeCheck.valid) {
          return {
            valid: false,
            errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
            errorMessage: safeCheck.error || 'Pola regex tidak valid.',
          };
        }
        try {
          const re = new RegExp(pattern);
          if (!re.test(String(value))) {
            return {
              valid: false,
              errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
              errorMessage: field.validation?.patternError || `${field.label} tidak sesuai dengan format yang diminta.`,
            };
          }
        } catch {
          return {
            valid: false,
            errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
            errorMessage: 'Pola regex tidak valid.',
          };
        }
      }
      return { valid: true };
    }

    case 'radio':
    case 'dropdown': {
      const strVal = String(value);
      const validOption = field.options?.some((opt) => opt.value === strVal);
      if (field.options && field.options.length > 0 && !validOption) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: 'Pilihan yang Anda pilih tidak tersedia.',
        };
      }
      return { valid: true };
    }

    case 'checkbox': {
      if (!Array.isArray(value)) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: `${field.label} harus berupa daftar pilihan.`,
        };
      }
      if (field.options && field.options.length > 0) {
        const validValues = new Set(field.options.map((o) => o.value));
        const allMatch = value.every((v) => validValues.has(String(v)));
        if (!allMatch) {
          return {
            valid: false,
            errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
            errorMessage: 'Terdapat pilihan yang tidak terdaftar.',
          };
        }
      }
      return { valid: true };
    }

    case 'link': {
      const strVal = String(value).trim();
      try {
        const parsedUrl = new URL(strVal);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return {
            valid: false,
            errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
            errorMessage: 'Tautan harus menggunakan protokol http:// atau https://',
          };
        }
        if (field.validation?.allowedDomains && field.validation.allowedDomains.length > 0) {
          const hostname = parsedUrl.hostname.toLowerCase();
          const matchDomain = field.validation.allowedDomains.some((d) => {
            const cleanD = d.trim().toLowerCase();
            return hostname === cleanD || hostname.endsWith('.' + cleanD);
          });
          if (!matchDomain) {
            return {
              valid: false,
              errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
              errorMessage: `Domain tautan harus salah satu dari: ${field.validation.allowedDomains.join(', ')}`,
            };
          }
        }
      } catch {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: 'Format tautan / URL tidak valid.',
        };
      }
      return { valid: true };
    }

    case 'file': {
      const files = Array.isArray(value) ? value : [value];
      const maxCount = field.validation?.maxFileCount || 1;
      if (files.length > maxCount) {
        return {
          valid: false,
          errorCode: ERROR_CODES.JUMLAH_FILE_MELEBIHI_BATAS,
          errorMessage: `Maksimal berkas yang dapat diunggah adalah ${maxCount}.`,
        };
      }
      return { valid: true };
    }

    case 'date': {
      const strVal = String(value).trim();
      const date = new Date(strVal);
      if (isNaN(date.getTime())) {
        return {
          valid: false,
          errorCode: ERROR_CODES.FORMAT_TIDAK_VALID,
          errorMessage: 'Format tanggal tidak valid.',
        };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

export function validateFormSubmission(
  schema: FormSchema,
  rawAnswers: Record<string, any>
): {
  valid: boolean;
  errors: Record<string, { errorCode: string; errorMessage: string }>;
  cleanedAnswers: Record<string, any>;
  hiddenFieldIds: string[];
} {
  const { visibleAnswers, hiddenFieldIds } = filterVisibleAnswersAndFiles(schema, rawAnswers);
  const errors: Record<string, { errorCode: string; errorMessage: string }> = {};

  for (const page of schema.pages) {
    for (const field of page.fields) {
      if (hiddenFieldIds.includes(field.id) || field.archived) {
        continue;
      }

      const val = visibleAnswers[field.id];
      const result = validateAnswerForField(field, val);
      if (!result.valid && result.errorCode && result.errorMessage) {
        errors[field.id] = {
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        };
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleanedAnswers: visibleAnswers,
    hiddenFieldIds,
  };
}
