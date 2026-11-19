export function formatDateJakarta(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date) + ' WIB';
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Cegah formula injection pada CSV & XLSX:
 * Nilai sel yang diawali `=`, `+`, `-`, `@`, tab (`\t`), newline (`\n`), atau carriage return (`\r`)
 * diberi awalan petik tunggal (`'`).
 */
export function sanitizeFormulaInjection(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[\t\r\n]*[=+\-@]|^[\t\r\n]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
