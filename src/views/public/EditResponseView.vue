<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { FormSchema } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { getErrorMessage } from '@shared/errors';
import FormRenderer from '@/components/form-renderer/FormRenderer.vue';

const route = useRoute();
const token = computed(() => route.params.token as string);

const formMeta = ref<any | null>(null);
const schema = ref<FormSchema>({ pages: [] });
const initialAnswers = ref<Record<string, any>>({});
const isLoading = ref(true);
const isSaving = ref(false);
const errorCode = ref<string | null>(null);
const saveSuccess = ref(false);

async function fetchEditData() {
  isLoading.value = true;
  errorCode.value = null;

  try {
    const res = await fetch(`/api/public/edit/${token.value}`);
    const data = await res.json();

    if (!res.ok) {
      errorCode.value = data.errorCode || 'TOKEN_EDIT_TIDAK_VALID';
      return;
    }

    formMeta.value = data.form;
    schema.value = data.schema;
    initialAnswers.value = data.answers || {};
  } catch {
    errorCode.value = 'TERJADI_KESALAHAN';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchEditData();
});

async function handleUpdate(payload: { answers: Record<string, any> }) {
  isSaving.value = true;
  saveSuccess.value = false;

  try {
    const res = await fetch(`/api/public/edit/${token.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payload.answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(getErrorMessage(data.errorCode));
      return;
    }

    saveSuccess.value = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    alert('Gagal memperbarui tanggapan.');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316] py-8 px-4 sm:px-6">
    <!-- Header -->
    <header class="max-w-2xl mx-auto w-full mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C83338] to-[#291C33] flex items-center justify-center font-agencyfb font-bold text-xl text-white shadow-md border border-white/10">
          K
        </div>
        <span class="font-pt-sans-bold text-base text-white tracking-wide">
          {{ UI_MESSAGES.app.name }}
        </span>
      </div>
      <span class="text-xs font-hack text-white/40">
        {{ UI_MESSAGES.app.organization }}
      </span>
    </header>

    <main class="flex-1 flex flex-col items-center justify-start">
      <!-- Loading -->
      <div v-if="isLoading" class="p-16 text-center text-white/50 text-sm font-hack">
        {{ UI_MESSAGES.common.loading }}
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorCode"
        class="max-w-md w-full kaliber-card-solid rounded-xl p-8 border border-white/15 text-center flex flex-col items-center gap-4 shadow-xl"
      >
        <div class="w-14 h-14 rounded-full bg-rose-500/10 text-[#E5383B] flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <h2 class="text-xl font-pt-sans-bold text-white">
          {{ getErrorMessage(errorCode) }}
        </h2>
        <p class="text-xs text-white/70 font-pt-sans">
          Pastikan tautan yang Anda gunakan sesuai atau hubungi pengelola formulir.
        </p>
      </div>

      <!-- Edit Form Renderer -->
      <div v-else-if="formMeta" class="w-full">
        <!-- Update Success Banner -->
        <div
          v-if="saveSuccess"
          class="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3 shadow-lg"
        >
          <span class="text-xl">✓</span>
          <span class="font-pt-sans">Tanggapan Anda telah berhasil diperbarui di sistem.</span>
        </div>

        <FormRenderer
          :schema="schema"
          :title="formMeta.title"
          :description="formMeta.description"
          :initial-answers="initialAnswers"
          :is-edit-mode="true"
          :locked-field-id="formMeta.unique_field_id"
          :loading="isSaving"
          @submit="handleUpdate"
        />
      </div>
    </main>

    <footer class="max-w-2xl mx-auto w-full text-center text-xs font-hack text-white/30 pt-8 pb-4">
      {{ UI_MESSAGES.app.footerCopyright }}
    </footer>
  </div>
</template>
