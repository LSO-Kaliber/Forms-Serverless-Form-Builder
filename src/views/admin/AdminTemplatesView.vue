<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { FormRecord } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import KaliberNavbar from '@/components/common/KaliberNavbar.vue';
import KaliberFooter from '@/components/common/KaliberFooter.vue';
import KaliberButton from '@/components/common/KaliberButton.vue';

const router = useRouter();
const templates = ref<FormRecord[]>([]);
const isLoading = ref(true);

async function fetchTemplates() {
  isLoading.value = true;
  try {
    const res = await fetch('/api/admin/forms');
    if (res.ok) {
      const data = await res.json();
      templates.value = (data.forms || []).filter((f: FormRecord) => Boolean(f.is_template));
    }
  } catch (err) {
    console.error('Gagal mengambil templat:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTemplates();
});

async function useTemplate(templateId: string) {
  try {
    const res = await fetch(`/api/admin/forms/${templateId}/duplicate`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/forms/${data.form.id}/builder`);
    }
  } catch {
    alert('Gagal membuat formulir dari templat.');
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316]">
    <KaliberNavbar />

    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-pt-sans-bold text-white tracking-tight">
          {{ UI_MESSAGES.nav.templates }}
        </h1>
        <p class="text-xs sm:text-sm text-white/60 font-hack mt-1">
          Daftar templat formulir standar organisasi yang siap digunakan kapan saja
        </p>
      </div>

      <div v-if="isLoading" class="p-12 text-center text-white/40 text-sm font-hack">
        {{ UI_MESSAGES.common.loading }}
      </div>

      <div
        v-else-if="templates.length === 0"
        class="kaliber-card-solid p-12 text-center rounded-xl border border-white/10 text-white/50 flex flex-col items-center gap-3"
      >
        <span class="text-3xl">📑</span>
        <p class="font-pt-sans text-sm">Belum ada templat yang ditandai.</p>
        <p class="text-xs font-hack text-white/40">
          Anda dapat menandai formulir apa pun sebagai templat di menu Pengaturan Builder.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="kaliber-card-solid rounded-xl p-5 border border-white/10 hover:border-white/30 flex flex-col justify-between gap-4"
        >
          <div class="flex flex-col gap-2">
            <span class="text-xs font-hack text-[#E5383B] uppercase tracking-wider">Templat Formulir</span>
            <h3 class="font-pt-sans-bold text-lg text-white">
              {{ tpl.title }}
            </h3>
            <p v-if="tpl.description" class="text-xs text-white/60 line-clamp-3">
              {{ tpl.description }}
            </p>
          </div>

          <div class="pt-3 border-t border-white/10 flex items-center justify-between">
            <router-link
              :to="`/admin/forms/${tpl.id}/builder`"
              class="text-xs font-hack text-white/60 hover:text-white"
            >
              Lihat Desain
            </router-link>

            <KaliberButton variant="primary" @click="useTemplate(tpl.id)">
              {{ UI_MESSAGES.builder.useTemplateButton }}
            </KaliberButton>
          </div>
        </div>
      </div>
    </main>

    <KaliberFooter />
  </div>
</template>
