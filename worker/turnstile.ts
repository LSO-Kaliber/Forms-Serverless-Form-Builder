export async function verifyTurnstile(
  token: string | undefined,
  turnstileSecret: string | undefined,
  remoteIp: string | undefined
): Promise<{ success: boolean; error?: string }> {
  // If TURNSTILE_SECRET is not set (e.g. local dev), bypass verification with a warning log
  if (!turnstileSecret || turnstileSecret.trim() === '') {
    console.warn('[TURNSTILE] TURNSTILE_SECRET tidak disetel; verifikasi dilewati (mode pengembangan).');
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'Token Turnstile tidak ada' };
  }

  try {
    const formData = new FormData();
    formData.append('secret', turnstileSecret);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      return { success: false, error: result['error-codes']?.join(', ') || 'Verifikasi Turnstile gagal' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[TURNSTILE] Gagal menghubungi layanan Turnstile:', err);
    return { success: false, error: err.message };
  }
}
