<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { UI_MESSAGES } from '@shared/messages';

const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  if (confirm(UI_MESSAGES.auth.logoutConfirm)) {
    await authStore.logout();
    router.push('/login');
  }
}
</script>

<template>
  <nav class="sticky top-0 z-40 w-full bg-[#101316]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <router-link to="/admin" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C83338] to-[#291C33] flex items-center justify-center font-agencyfb font-bold text-2xl text-white shadow-md border border-white/10 group-hover:scale-105 transition-transform">
          K
        </div>
        <div class="flex flex-col">
          <span class="font-pt-sans-bold text-lg text-white leading-tight tracking-wide flex items-center gap-1.5">
            {{ UI_MESSAGES.app.name }}
            <span class="text-[10px] font-hack uppercase px-1.5 py-0.5 rounded bg-[#C83338]/30 text-[#E5383B] border border-[#C83338]/40">
              Free Tier
            </span>
          </span>
          <span class="text-xs font-hack text-white/50 tracking-wider">
            {{ UI_MESSAGES.app.organization }}
          </span>
        </div>
      </router-link>

      <div v-if="authStore.isAuthenticated" class="flex items-center gap-3 md:gap-6">
        <router-link
          to="/admin"
          active-class="text-[#E5383B] border-b-2 border-[#E5383B]"
          class="text-sm font-pt-sans text-white/80 hover:text-white transition-colors py-1"
        >
          {{ UI_MESSAGES.nav.forms }}
        </router-link>
        <router-link
          to="/admin/templates"
          active-class="text-[#E5383B] border-b-2 border-[#E5383B]"
          class="text-sm font-pt-sans text-white/80 hover:text-white transition-colors py-1"
        >
          {{ UI_MESSAGES.nav.templates }}
        </router-link>
        <button
          @click="handleLogout"
          class="text-xs font-hack text-white/70 hover:text-[#ff6b6d] px-3 py-1.5 rounded border border-white/10 hover:border-[#ff6b6d]/40 transition-all flex items-center gap-1"
        >
          <span>🚪</span>
          <span class="hidden sm:inline">{{ UI_MESSAGES.auth.logoutButton }}</span>
        </button>
      </div>

      <div v-else class="text-xs font-hack text-white/50">
        {{ UI_MESSAGES.app.subtitle }}
      </div>
    </div>
  </nav>
</template>
