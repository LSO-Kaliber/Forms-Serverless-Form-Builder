<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { PublicFormView } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { getErrorMessage } from '@shared/errors';
import FormRenderer from '@/components/form-renderer/FormRenderer.vue';

const route = useRoute();
const router = useRouter();

const slug = computed(() => route.params.slug as string);

const form = ref<PublicFormView | null>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const errorCode = ref<string | null>(null);
const submitError = ref<string | null>(null);

async function fetchForm() {
  isLoading.value = true;
  errorCode.value = null;

  try {
    const res = await fetch(`/api/public/forms/${slug.value}`);
    const data = await res.json();

    if (!res.ok) {
      errorCode.value = data.errorCode || 'FORM_TIDAK_DITEMUKAN';
      return;
    }

    form.value = data.form;
  } catch {
    errorCode.value = 'TERJADI_KESALAHAN';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchForm();
});

async function handleSubmit(payload: { answers: Record<string, any>; honeypot: string; turnstileToken?: string }) {
  if (!form.value) return;
  isSubmitting.value = true;
  submitError.value = null;

  // Generate an idempotency key per submit attempt
  const idempotencyKey = `idem_${crypto.randomUUID()}`;

  try {
    const res = await fetch(`/api/public/forms/${slug.value}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        ...payload,
        idempotencyKey,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      submitError.value = getErrorMessage(data.errorCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Save edit token in localStorage if present
    if (data.editToken) {
      try {
        const key = `kaliber_edit_${slug.value}`;
        localStorage.setItem(key, data.editToken);
      } catch {}
    }

    // Navigate to thank you view
    router.push({
      path: `/forms/${slug.value}/terima-kasih`,
      query: {
        token: data.editToken || undefined,
        thankYou: data.customThankYou || undefined,
      },
    });
  } catch {
    submitError.value = 'Terjadi kesalahan saat mengirim tanggapan. Silakan periksa koneksi Anda.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316] py-8 px-4 sm:px-6">
    <!-- Top branding -->
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

    <!-- Main Content State -->
    <main class="flex-1 flex flex-col items-center justify-start">
      <!-- Loading -->
      <div v-if="isLoading" class="p-16 text-center text-white/50 text-sm font-hack">
        {{ UI_MESSAGES.common.loading }}
      </div>

      <!-- Error / Closed / Full / Not Found States -->
      <div
        v-else-if="errorCode || form?.is_closed || form?.is_full"
        class="max-w-md w-full kaliber-card-solid rounded-xl p-8 border border-white/15 text-center flex flex-col items-center gap-4 shadow-xl"
      >
        <!-- Icon -->
        <div class="w-14 h-14 rounded-full bg-rose-500/10 text-[#E5383B] flex items-center justify-center text-3xl">
          <span v-if="form?.is_full">👥</span>
          <span v-else-if="form?.is_closed">🔒</span>
          <span v-else>⚠️</span>
        </div>

        <h2 class="text-xl font-pt-sans-bold text-white">
          <template v-if="form?.is_full">{{ UI_MESSAGES.publicForm.quotaFullTitle }}</template>
          <template v-else-if="form?.is_closed">{{ UI_MESSAGES.publicForm.formClosedTitle }}</template>
          <template v-else-if="errorCode === 'FORM_MASIH_DRAFT'">{{ UI_MESSAGES.publicForm.draftTitle }}</template>
          <template v-else>{{ UI_MESSAGES.publicForm.notFoundTitle }}</template>
        </h2>

        <p class="text-xs text-white/70 leading-relaxed font-pt-sans">
          <template v-if="form?.is_full">{{ UI_MESSAGES.publicForm.quotaFullDesc }}</template>
          <template v-else-if="form?.is_closed">{{ UI_MESSAGES.publicForm.formClosedDesc }}</template>
          <template v-else-if="errorCode === 'FORM_MASIH_DRAFT'">{{ UI_MESSAGES.publicForm.draftDesc }}</template>
          <template v-else>{{ UI_MESSAGES.publicForm.notFoundDesc }}</template>
        </p>
      </div>

      <!-- Active Form View -->
      <div v-else-if="form" class="w-full">
        <!-- Error Alert from Submit -->
        <div
          v-if="submitError"
          class="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-[#ff6b6d] text-sm flex items-center gap-3 shadow-lg"
        >
          <span class="text-xl">⚠️</span>
          <span class="font-pt-sans">{{ submitError }}</span>
        </div>

        <FormRenderer
          :schema="form.schema"
          :title="form.title"
          :description="form.description"
          :slug="form.slug"
          :loading="isSubmitting"
          @submit="handleSubmit"
        />
      </div>
    </main>

    <!-- Footer -->
    <footer class="max-w-2xl mx-auto w-full text-center text-xs font-hack text-white/30 pt-8 pb-4">
      {{ UI_MESSAGES.app.footerCopyright }}
    </footer>
  </div>
</template>
