<script setup lang="ts">
import KaliberButton from './KaliberButton.vue';

interface Props {
  show: boolean;
  title: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Konfirmasi',
  cancelText: 'Batal',
  isDanger: false,
  loading: false,
});

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    @click.self="$emit('close')"
  >
    <div
      class="bg-[#1d2226] border border-white/20 rounded-xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4 text-white transform transition-all duration-300"
    >
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-lg font-pt-sans-bold tracking-tight text-white flex items-center gap-2">
          <span v-if="isDanger" class="text-[#ff6b6d]">⚠️</span>
          {{ title }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      <div class="text-sm text-white/80 leading-relaxed font-pt-sans">
        <slot />
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <KaliberButton variant="secondary" @click="$emit('close')">
          {{ cancelText }}
        </KaliberButton>
        <KaliberButton
          :variant="isDanger ? 'danger' : 'primary'"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </KaliberButton>
      </div>
    </div>
  </div>
</template>
