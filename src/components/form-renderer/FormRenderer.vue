<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FormSchema } from '@shared/types';
import { getNextPageId, isPageVisible, filterVisibleAnswersAndFiles } from '@shared/evaluator';
import { validateAnswerForField } from '@shared/validator';
import { UI_MESSAGES } from '@shared/messages';
import FieldRenderer from './FieldRenderer.vue';
import KaliberButton from '../common/KaliberButton.vue';

interface Props {
  schema: FormSchema;
  title: string;
  description?: string;
  initialAnswers?: Record<string, any>;
  slug?: string;
  isTestingMode?: boolean;
  isEditMode?: boolean;
  lockedFieldId?: string | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  initialAnswers: () => ({}),
  slug: '',
  isTestingMode: false,
  isEditMode: false,
  lockedFieldId: null,
  loading: false,
});

const emit = defineEmits<{
  (e: 'submit', payload: { answers: Record<string, any>; honeypot: string; turnstileToken?: string }): void;
}>();

const answers = ref<Record<string, any>>({ ...props.initialAnswers });
const fieldErrors = ref<Record<string, string>>({});
const currentPageIndex = ref(0);
const pageHistory = ref<number[]>([0]);
const honeypotValue = ref('');
const turnstileToken = ref('');

// Sync initial answers when props change
watch(
  () => props.initialAnswers,
  (newVal) => {
    if (newVal) answers.value = { ...newVal };
  },
  { deep: true }
);

// All visible pages based on current answers
const visiblePages = computed(() => {
  return props.schema.pages.filter((p) => isPageVisible(p, answers.value));
});

const currentPage = computed(() => {
  if (visiblePages.value.length === 0) return null;
  return visiblePages.value[currentPageIndex.value] || visiblePages.value[0];
});

const visibleFieldsOnCurrentPage = computed(() => {
  if (!currentPage.value) return [];
  const { hiddenFieldIds } = filterVisibleAnswersAndFiles(props.schema, answers.value);
  const hiddenSet = new Set(hiddenFieldIds);
  return currentPage.value.fields.filter((f) => !hiddenSet.has(f.id));
});

const progressPercent = computed(() => {
  if (visiblePages.value.length <= 1) return 100;
  return Math.round(((currentPageIndex.value + 1) / visiblePages.value.length) * 100);
});

function validateCurrentPage(): boolean {
  if (!currentPage.value) return true;
  let isValid = true;
  const newErrors: Record<string, string> = { ...fieldErrors.value };

  for (const field of visibleFieldsOnCurrentPage.value) {
    const val = answers.value[field.id];
    const check = validateAnswerForField(field, val);
    if (!check.valid && check.errorMessage) {
      newErrors[field.id] = check.errorMessage;
      isValid = false;
    } else {
      delete newErrors[field.id];
    }
  }

  fieldErrors.value = newErrors;
  return isValid;
}

function handleNext() {
  if (!validateCurrentPage()) return;
  if (!currentPage.value) return;

  const nextTarget = getNextPageId(currentPage.value.id, props.schema, answers.value);

  if (nextTarget === 'SUBMIT') {
    handleSubmit();
    return;
  }

  if (nextTarget) {
    const nextIdx = visiblePages.value.findIndex((p) => p.id === nextTarget);
    if (nextIdx !== -1) {
      pageHistory.value.push(currentPageIndex.value);
      currentPageIndex.value = nextIdx;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  // Fallback sequential next
  if (currentPageIndex.value < visiblePages.value.length - 1) {
    pageHistory.value.push(currentPageIndex.value);
    currentPageIndex.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    handleSubmit();
  }
}

function handlePrevious() {
  if (pageHistory.value.length > 1) {
    const prevIdx = pageHistory.value.pop()!;
    currentPageIndex.value = prevIdx;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function validateField(fieldId: string) {
  const field = visibleFieldsOnCurrentPage.value.find((f) => f.id === fieldId);
  if (!field) return;
  const val = answers.value[fieldId];
  const check = validateAnswerForField(field, val);
  if (!check.valid && check.errorMessage) {
    fieldErrors.value[fieldId] = check.errorMessage;
  } else {
    delete fieldErrors.value[fieldId];
  }
}

const showTestingSuccess = ref(false);

function handleSubmit() {
  if (!validateCurrentPage()) return;

  if (props.isTestingMode) {
    showTestingSuccess.value = true;
    return;
  }

  emit('submit', {
    answers: answers.value,
    honeypot: honeypotValue.value,
    turnstileToken: turnstileToken.value,
  });
}
</script>

<template>
  <div class="w-full max-w-2xl mx-auto flex flex-col gap-6">
    <!-- Testing Mode Notice Banner -->
    <div
      v-if="isTestingMode"
      class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm flex items-center gap-3 shadow-lg"
    >
      <span class="text-xl">🧪</span>
      <div>
        <p class="font-pt-sans-bold">{{ UI_MESSAGES.common.testingMode }}</p>
        <p class="text-xs text-amber-300/80">Validasi dan logika navigasi berjalan penuh. Tidak ada data yang disimpan ke database.</p>
      </div>
    </div>

    <!-- Edit Mode Notice -->
    <div
      v-if="isEditMode"
      class="p-4 rounded-xl bg-[#C83338]/15 border border-[#C83338]/40 text-white text-sm flex items-center gap-3 shadow-lg"
    >
      <span class="text-xl">✏️</span>
      <div>
        <p class="font-pt-sans-bold">{{ UI_MESSAGES.publicForm.editModeBadge }}</p>
        <p class="text-xs text-white/70">{{ UI_MESSAGES.publicForm.editingResponseNotice }}</p>
      </div>
    </div>

    <!-- Form Header Card -->
    <div class="kaliber-card-solid rounded-xl p-6 sm:p-8 border border-white/15 shadow-xl relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C83338] via-[#E5383B] to-[#291C33]"></div>
      <h1 class="text-2xl sm:text-3xl font-pt-sans-bold text-white mb-2 leading-tight">
        {{ title }}
      </h1>
      <p v-if="description" class="text-sm sm:text-base text-white/70 whitespace-pre-line leading-relaxed">
        {{ description }}
      </p>

      <!-- Progress bar if multi-page -->
      <div v-if="visiblePages.length > 1" class="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs font-hack text-white/60">
          <span>Halaman {{ currentPageIndex + 1 }} dari {{ visiblePages.length }}</span>
          <span>{{ progressPercent }}% Selesai</span>
        </div>
        <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full bg-[#E5383B] transition-all duration-300 rounded-full"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Current Page Container -->
    <div v-if="currentPage" class="flex flex-col gap-6">
      <div v-if="currentPage.title || currentPage.description" class="px-1">
        <h2 v-if="currentPage.title" class="text-lg font-pt-sans-bold text-white/90">
          {{ currentPage.title }}
        </h2>
        <p v-if="currentPage.description" class="text-xs text-white/60 mt-0.5">
          {{ currentPage.description }}
        </p>
      </div>

      <!-- Field List -->
      <div class="flex flex-col gap-5">
        <div
          v-for="field in visibleFieldsOnCurrentPage"
          :key="field.id"
          class="kaliber-card-solid rounded-xl p-5 sm:p-6 border border-white/10 hover:border-white/20 transition-all shadow-md"
        >
          <FieldRenderer
            :field="field"
            v-model="answers[field.id]"
            :error="fieldErrors[field.id]"
            :disabled="isEditMode && lockedFieldId === field.id"
            :slug="slug"
            :is-testing-mode="isTestingMode"
            @validate="validateField(field.id)"
          />
        </div>
      </div>

      <!-- Honeypot hidden input for anti-bot protection -->
      <div class="opacity-0 absolute -left-[9999px] -top-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label for="kaliber_hp_field">{{ UI_MESSAGES.publicForm.honeypotLabel }}</label>
        <input
          id="kaliber_hp_field"
          type="text"
          v-model="honeypotValue"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <!-- Navigation & Action Buttons -->
      <div class="flex items-center justify-between gap-4 pt-4 pb-12">
        <div>
          <KaliberButton
            v-if="currentPageIndex > 0 || pageHistory.length > 1"
            variant="secondary"
            type="button"
            @click="handlePrevious"
          >
            ← {{ UI_MESSAGES.common.previous }}
          </KaliberButton>
        </div>

        <div>
          <KaliberButton
            v-if="currentPageIndex < visiblePages.length - 1"
            variant="primary"
            type="button"
            @click="handleNext"
          >
            {{ UI_MESSAGES.common.next }} →
          </KaliberButton>

          <KaliberButton
            v-else
            variant="primary"
            type="button"
            :loading="loading"
            @click="handleSubmit"
          >
            {{ UI_MESSAGES.common.submit }}
          </KaliberButton>
        </div>
      </div>
    </div>

    <!-- Simulated modal for testing mode -->
    <div
      v-if="showTestingSuccess"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div class="kaliber-card-solid max-w-md w-full p-6 rounded-xl border border-white/20 flex flex-col gap-4 text-center">
        <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
          ✓
        </div>
        <h3 class="text-lg font-pt-sans-bold text-white">Validasi Berhasil (Mode Uji)</h3>
        <p class="text-xs text-white/70">
          Seluruh kolom wajib dan aturan logika validasi terpenuhi dengan sukses. Dalam form publik yang sesungguhnya, data ini akan disimpan ke D1.
        </p>
        <KaliberButton variant="primary" @click="showTestingSuccess = false">
          Tutup Pratinjau
        </KaliberButton>
      </div>
    </div>
  </div>
</template>
