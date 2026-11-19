<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-md font-pt-sans-bold text-sm tracking-wide transition-all duration-200 select-none cursor-pointer',
      'focus-visible:outline-2 focus-visible:outline-[#ff6b6d] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      variant === 'primary' && 'bg-[#C83338] hover:bg-[#a8262b] active:translate-y-px text-white shadow-md hover:shadow-lg',
      variant === 'secondary' && 'bg-[#1d2226] hover:bg-[#252c31] border border-white/20 text-white hover:border-white/40',
      variant === 'danger' && 'bg-[#E5383B] hover:bg-[#c52d30] text-white active:translate-y-px',
      variant === 'ghost' && 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white',
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <slot />
  </button>
</template>
