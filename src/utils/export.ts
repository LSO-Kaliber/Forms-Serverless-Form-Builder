import * as XLSX from 'xlsx';
import type { FormField, FormSchema } from '@shared/types';
import { formatDateJakarta, sanitizeFormulaInjection } from './formatters';

export function exportResponsesToSpreadsheet(
  responses: Array<{
    id: string;
    submitted_at: string;
    unique_key: string | null;
    answers: Record<string, any>;
    files?: Array<{ id: string; filename: string; download_url?: string }>;
  }>,
  schema: FormSchema,
  formTitle: string,
  format: 'xlsx' | 'csv'
) {
  // Collect all fields across all pages
  const fields: FormField[] = [];
  for (const page of schema.pages) {
    for (const f of page.fields) {
      if (f.type !== 'info') {
        fields.push(f);
      }
    }
  }

  // Build rows
  const rows = responses.map((r, index) => {
    const row: Record<string, string> = {
      'No': String(index + 1),
      'Waktu Kirim': sanitizeFormulaInjection(formatDateJakarta(r.submitted_at)),
      'Kunci Unik / NIM': sanitizeFormulaInjection(r.unique_key || '-'),
    };

    for (const field of fields) {
      const val = r.answers[field.id];
      if (val === undefined || val === null) {
        row[field.label] = '';
      } else if (field.type === 'file') {
        // Build download links or filenames
        if (Array.isArray(val)) {
          const links = val.map((item) => {
            if (typeof item === 'object' && item.download_url) {
              return `${window.location.origin}${item.download_url} (${item.filename})`;
            }
            return String(item);
          });
          row[field.label] = sanitizeFormulaInjection(links.join(', '));
        } else if (typeof val === 'object' && val.download_url) {
          row[field.label] = sanitizeFormulaInjection(`${window.location.origin}${val.download_url} (${val.filename})`);
        } else {
          row[field.label] = sanitizeFormulaInjection(String(val));
        }
      } else if (Array.isArray(val)) {
        row[field.label] = sanitizeFormulaInjection(val.join(', '));
      } else {
        row[field.label] = sanitizeFormulaInjection(val);
      }
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tanggapan');

  const cleanTitle = formTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Tanggapan_${cleanTitle}_${dateStr}.${format}`;

  if (format === 'csv') {
    XLSX.writeFile(workbook, filename, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
  }
}
