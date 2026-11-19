import { describe, it, expect } from 'vitest';
import {
  validateNimUmm,
  normalizeNimUmm,
  validateEmailWebmailUmm,
  normalizeEmailWebmailUmm,
  isValidSlug,
  isSafeRegex,
  verifyMagicBytes,
} from './presets';

describe('Presets and Security Validators', () => {
  it('validates and normalizes UMM NIM (15 digits)', () => {
    expect(validateNimUmm('202210040311004')).toBe(true);
    expect(validateNimUmm('  202210040311004  ')).toBe(true);
    expect(validateNimUmm('20221004031100')).toBe(false); // 14 digits
    expect(validateNimUmm('2022100403110045')).toBe(false); // 16 digits
    expect(validateNimUmm('20221004031100A')).toBe(false); // letter
    expect(validateNimUmm('2022-1004-0311004')).toBe(false); // hyphens

    expect(normalizeNimUmm('  202210040311004 ')).toBe('202210040311004');
  });

  it('validates and normalizes UMM webmail email', () => {
    expect(validateEmailWebmailUmm('rico@webmail.umm.ac.id')).toBe(true);
    expect(validateEmailWebmailUmm('Rico.User@Webmail.umm.ac.id ')).toBe(true);
    expect(validateEmailWebmailUmm('rico@gmail.com')).toBe(false);
    expect(validateEmailWebmailUmm('rico@umm.ac.id')).toBe(false);

    expect(normalizeEmailWebmailUmm(' Rico@Webmail.UMM.ac.id ')).toBe('rico@webmail.umm.ac.id');
  });

  it('validates slugs including reserved and length constraints', () => {
    expect(isValidSlug('open-recruitment-2026')).toBe(true);
    expect(isValidSlug('pendaftaran')).toBe(true);
    expect(isValidSlug('ab')).toBe(false); // < 3 chars
    expect(isValidSlug('admin')).toBe(false); // reserved
    expect(isValidSlug('api')).toBe(false); // reserved
    expect(isValidSlug('login')).toBe(false); // reserved
    expect(isValidSlug('-invalid-')).toBe(false); // leading/trailing hyphen
    expect(isValidSlug('has spaces')).toBe(false);
    expect(isValidSlug('CAPITALS')).toBe(false);
  });

  it('checks custom regex safety and anchors', () => {
    // Valid anchored regex
    expect(isSafeRegex('^[A-Z]{3}-\\d{4}$').valid).toBe(true);

    // Unanchored regex
    expect(isSafeRegex('[A-Z]{3}').valid).toBe(false);

    // ReDoS risk regex
    expect(isSafeRegex('^([a-zA-Z]+)+$').valid).toBe(false);
  });

  it('verifies magic bytes for allowed files and blocks dangerous files', () => {
    // PNG magic bytes
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(verifyMagicBytes(pngBytes, 'png', 'image/png')).toBe(true);

    // PDF magic bytes
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(verifyMagicBytes(pdfBytes, 'pdf', 'application/pdf')).toBe(true);

    // Fake PDF (text file pretending to be pdf)
    const fakePdfBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(verifyMagicBytes(fakePdfBytes, 'pdf', 'application/pdf')).toBe(false);

    // Reject SVG / HTML even if disguised
    expect(verifyMagicBytes(new Uint8Array([0x3c, 0x73, 0x76, 0x67]), 'svg', 'image/svg+xml')).toBe(false);
    expect(verifyMagicBytes(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]), 'html', 'text/html')).toBe(false);
  });
});
