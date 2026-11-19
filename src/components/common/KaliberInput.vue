<script setup lang="ts">
interface Props {
  modelValue?: string | number | null;
  label?: string;
  helpText?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  helpText: '',
  placeholder: '',
  type: 'text',
  required: false,
  disabled: false,
  error: '',
  id: () => `in_${Math.random().toString(36).substring(2, 9)}`,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', props.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value);
}
</script>

<template>
  <div class="w-full flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-hack text-white/90 flex items-center justify-between">
      <span>
        {{ label }}
        <span v-if="required" class="text-[#E5383B] ml-0.5">*</span>
      </span>
      <span v-if="!required" class="text-xs text-white/40 font-normal">Opsional</span>
    </label>

    <div class="relative">
      <textarea
        v-if="type === 'textarea'"
        :id="id"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        rows="3"
        @input="onInput"
        :class="[
          'w-full bg-[#1d2226] text-white placeholder-[#9ea5ad] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none',
          'border',
          error ? 'border-[#ff6b6d] focus:ring-2 focus:ring-[#ff6b6d]/40' : 'border-white/20 focus:border-[#E5383B] focus:ring-2 focus:ring-[#E5383B]/30',
          disabled && 'opacity-60 cursor-not-allowed bg-black/40',
        ]"
      ></textarea>

      <input
        v-else
        :id="id"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="onInput"
        :class="[
          'w-full min-h-[44px] bg-[#1d2226] text-white placeholder-[#9ea5ad] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none',
          'border',
          error ? 'border-[#ff6b6d] focus:ring-2 focus:ring-[#ff6b6d]/40' : 'border-white/20 focus:border-[#E5383B] focus:ring-2 focus:ring-[#E5383B]/30',
          disabled && 'opacity-60 cursor-not-allowed bg-black/40',
        ]"
      />
    </div>

    <p v-if="error" class="text-xs text-[#ff6b6d] flex items-center gap-1 font-pt-sans">
      <svg class="w-3.5 h-3.5 inline shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="helpText" class="text-xs text-[#9ea5ad] font-pt-sans leading-relaxed">
      {{ helpText }}
    </p>
  </div>
</template>
