<script setup lang="ts">
interface Props {
  gradient?: boolean;
}

withDefaults(defineProps<Props>(), {
  gradient: false,
});
</script>

<template>
  <div
    :class="[
      'rounded-xl p-6 transition-all duration-300 relative overflow-hidden',
      gradient ? 'kaliber-card-gradient shadow-lg' : 'kaliber-card-solid',
    ]"
  >
    <slot />
  </div>
</template>
