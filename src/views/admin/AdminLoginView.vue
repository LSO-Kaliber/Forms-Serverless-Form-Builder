<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { UI_MESSAGES } from '@shared/messages';
import KaliberInput from '@/components/common/KaliberInput.vue';
import KaliberButton from '@/components/common/KaliberButton.vue';

const password = ref('');
const authStore = useAuthStore();
const router = useRouter();

async function handleLogin() {
  if (!password.value) return;
  const success = await authStore.login(password.value);
  if (success) {
    router.push('/admin');
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-[#101316]">
    <div class="w-full max-w-md">
      <!-- Glow effect -->
      <div class="relative">
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-[#C83338]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-[#291C33]/40 rounded-full blur-3xl pointer-events-none"></div>

        <div class="kaliber-card-solid rounded-2xl p-8 border border-white/15 shadow-2xl relative">
          <!-- Logo & Header -->
          <div class="flex flex-col items-center text-center mb-8">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C83338] to-[#291C33] flex items-center justify-center font-agencyfb font-bold text-3xl text-white shadow-lg mb-4 border border-white/20">
              K
            </div>
            <h1 class="text-2xl font-pt-sans-bold text-white tracking-wide">
              {{ UI_MESSAGES.auth.loginTitle }}
            </h1>
            <p class="text-xs text-white/60 font-hack mt-1">
              {{ UI_MESSAGES.auth.loginSubtitle }}
            </p>
          </div>

          <!-- Error Alert -->
          <div
            v-if="authStore.errorMessage"
            class="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[#ff6b6d] text-xs font-pt-sans flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{{ authStore.errorMessage }}</span>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
            <KaliberInput
              :label="UI_MESSAGES.auth.passwordLabel"
              type="password"
              v-model="password"
              :placeholder="UI_MESSAGES.auth.passwordPlaceholder"
              required
            />

            <KaliberButton
              type="submit"
              variant="primary"
              :loading="authStore.isLoading"
              class="w-full mt-2"
            >
              {{ authStore.isLoading ? UI_MESSAGES.auth.loggingIn : UI_MESSAGES.auth.loginButton }}
            </KaliberButton>
          </form>

          <div class="mt-8 pt-4 border-t border-white/10 text-center">
            <p class="text-[11px] font-hack text-white/40">
              {{ UI_MESSAGES.app.organization }} &bull; Serverless Cloudflare
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
