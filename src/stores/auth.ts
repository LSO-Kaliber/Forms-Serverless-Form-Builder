import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getErrorMessage } from '@shared/errors';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean | null>(null);
  const isLoading = ref<boolean>(false);
  const errorMessage = ref<string>('');

  async function checkAuth(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        isAuthenticated.value = Boolean(data.authenticated);
        return isAuthenticated.value;
      }
      isAuthenticated.value = false;
      return false;
    } catch {
      isAuthenticated.value = false;
      return false;
    }
  }

  async function login(password: string): Promise<boolean> {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMessage.value = getErrorMessage(data.errorCode);
        isAuthenticated.value = false;
        return false;
      }

      isAuthenticated.value = true;
      return true;
    } catch {
      errorMessage.value = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
      isAuthenticated.value = false;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      isAuthenticated.value = false;
    }
  }

  return {
    isAuthenticated,
    isLoading,
    errorMessage,
    checkAuth,
    login,
    logout,
  };
});
