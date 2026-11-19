<script setup lang="ts">
import { ref } from 'vue';
import type { FormField } from '@shared/types';
import { compressImageIfNeeded } from '@/utils/imageCompress';
import { UI_MESSAGES } from '@shared/messages';

interface Props {
  field: FormField;
  modelValue: any;
  error?: string;
  disabled?: boolean;
  slug?: string;
  isTestingMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  error: '',
  disabled: false,
  slug: '',
  isTestingMode: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'validate'): void;
}>();

const isUploading = ref(false);
const uploadError = ref('');

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const fileList = target.files;
  if (!fileList || fileList.length === 0) return;

  const file = fileList[0];
  uploadError.value = '';
  isUploading.value = true;

  try {
    // 1. Client-side image compression
    const processedFile = await compressImageIfNeeded(file);

    // If testing mode, simulate upload
    if (props.isTestingMode || !props.slug) {
      setTimeout(() => {
        isUploading.value = false;
        emit('update:modelValue', {
          id: `file_dummy_${Date.now()}`,
          filename: processedFile.name,
          size: processedFile.size,
          mime: processedFile.type,
        });
        emit('validate');
      }, 500);
      return;
    }

    // 2. Upload to Worker R2 endpoint
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('fieldId', props.field.id);

    const res = await fetch(`/api/public/forms/${props.slug}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      uploadError.value = data.errorCode || 'Gagal mengunggah berkas.';
      return;
    }

    emit('update:modelValue', data.file);
    emit('validate');
  } catch (err: any) {
    uploadError.value = err.message || 'Gagal memproses berkas.';
  } finally {
    isUploading.value = false;
    target.value = '';
  }
}

function removeUploadedFile() {
  emit('update:modelValue', null);
  emit('validate');
}

function onCheckboxChange(val: string, checked: boolean) {
  const current: string[] = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  if (checked) {
    if (!current.includes(val)) current.push(val);
  } else {
    const idx = current.indexOf(val);
    if (idx !== -1) current.splice(idx, 1);
  }
  emit('update:modelValue', current);
  emit('validate');
}
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <!-- Info Block type -->
    <div
      v-if="field.type === 'info'"
      class="p-4 rounded-lg bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed"
    >
      <h4 class="font-pt-sans-bold text-base text-white mb-1">{{ field.label }}</h4>
      <p v-if="field.helpText" class="text-white/70 whitespace-pre-line">{{ field.helpText }}</p>
    </div>

    <!-- Regular Form Field -->
    <div v-else class="flex flex-col gap-1.5">
      <label :for="field.id" class="text-sm font-hack text-white/95 flex items-center justify-between">
        <span>
          {{ field.label }}
          <span v-if="field.required" class="text-[#E5383B] ml-0.5 font-bold">*</span>
        </span>
        <span v-if="!field.required" class="text-xs text-white/40 font-normal">Opsional</span>
      </label>

      <!-- Text help -->
      <p v-if="field.helpText" class="text-xs text-[#9ea5ad] leading-relaxed">
        {{ field.helpText }}
      </p>

      <!-- Short Text / Number / Email / NIM / Webmail / Regex / Link / Date -->
      <div v-if="['text', 'number', 'email', 'nim_umm', 'email_umm', 'custom_regex', 'link', 'date'].includes(field.type)">
        <input
          :id="field.id"
          :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
          :value="modelValue ?? ''"
          :placeholder="field.placeholder || (field.type === 'nim_umm' ? 'Contoh: 202210040311004' : field.type === 'email_umm' ? 'nama@webmail.umm.ac.id' : '')"
          :disabled="disabled"
          @input="emit('update:modelValue', field.type === 'number' ? ($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value); emit('validate')"
          :class="[
            'w-full min-h-[44px] bg-[#1d2226] text-white placeholder-[#9ea5ad] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none border',
            error ? 'border-[#ff6b6d] focus:ring-2 focus:ring-[#ff6b6d]/40' : 'border-white/20 focus:border-[#E5383B] focus:ring-2 focus:ring-[#E5383B]/30',
            disabled && 'opacity-60 cursor-not-allowed bg-black/40',
          ]"
        />
      </div>

      <!-- Paragraph / Long Text -->
      <div v-else-if="field.type === 'paragraph'">
        <textarea
          :id="field.id"
          :value="modelValue ?? ''"
          :placeholder="field.placeholder || 'Tulis jawaban Anda di sini...'"
          :disabled="disabled"
          rows="4"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value); emit('validate')"
          :class="[
            'w-full bg-[#1d2226] text-white placeholder-[#9ea5ad] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none border',
            error ? 'border-[#ff6b6d] focus:ring-2 focus:ring-[#ff6b6d]/40' : 'border-white/20 focus:border-[#E5383B] focus:ring-2 focus:ring-[#E5383B]/30',
            disabled && 'opacity-60 cursor-not-allowed bg-black/40',
          ]"
        ></textarea>
      </div>

      <!-- Radio Choice -->
      <div v-else-if="field.type === 'radio'" class="flex flex-col gap-2 mt-1">
        <label
          v-for="opt in field.options || []"
          :key="opt.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#1d2226]/50 hover:bg-[#1d2226] hover:border-white/30 cursor-pointer transition-colors"
        >
          <input
            type="radio"
            :name="field.id"
            :value="opt.value"
            :checked="modelValue === opt.value"
            :disabled="disabled"
            @change="emit('update:modelValue', opt.value); emit('validate')"
            class="w-4 h-4 text-[#E5383B] bg-[#1d2226] border-white/30 focus:ring-[#E5383B] focus:ring-offset-0 focus:ring-2 cursor-pointer"
          />
          <span class="text-sm text-white/90">{{ opt.label }}</span>
        </label>
      </div>

      <!-- Checkbox Multiple Choice -->
      <div v-else-if="field.type === 'checkbox'" class="flex flex-col gap-2 mt-1">
        <label
          v-for="opt in field.options || []"
          :key="opt.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#1d2226]/50 hover:bg-[#1d2226] hover:border-white/30 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            :value="opt.value"
            :checked="Array.isArray(modelValue) && modelValue.includes(opt.value)"
            :disabled="disabled"
            @change="onCheckboxChange(opt.value, ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 rounded text-[#E5383B] bg-[#1d2226] border-white/30 focus:ring-[#E5383B] focus:ring-offset-0 focus:ring-2 cursor-pointer"
          />
          <span class="text-sm text-white/90">{{ opt.label }}</span>
        </label>
      </div>

      <!-- Dropdown Select -->
      <div v-else-if="field.type === 'dropdown'">
        <select
          :id="field.id"
          :value="modelValue ?? ''"
          :disabled="disabled"
          @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value); emit('validate')"
          :class="[
            'w-full min-h-[44px] bg-[#1d2226] text-white rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none border cursor-pointer',
            error ? 'border-[#ff6b6d] focus:ring-2 focus:ring-[#ff6b6d]/40' : 'border-white/20 focus:border-[#E5383B] focus:ring-2 focus:ring-[#E5383B]/30',
            disabled && 'opacity-60 cursor-not-allowed bg-black/40',
          ]"
        >
          <option value="" disabled selected>-- Pilih salah satu --</option>
          <option v-for="opt in field.options || []" :key="opt.id" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- File Upload Dropzone -->
      <div v-else-if="field.type === 'file'" class="flex flex-col gap-2">
        <div
          v-if="modelValue"
          class="flex items-center justify-between p-3.5 rounded-lg bg-[#1d2226] border border-white/20"
        >
          <div class="flex items-center gap-2.5 overflow-hidden">
            <span class="text-lg">📎</span>
            <div class="flex flex-col overflow-hidden">
              <span class="text-sm font-hack text-white truncate">
                {{ typeof modelValue === 'object' ? modelValue.filename : 'Berkas Terunggah' }}
              </span>
              <span v-if="modelValue.size" class="text-xs text-white/50">
                {{ (modelValue.size / 1024).toFixed(1) }} KB
              </span>
            </div>
          </div>
          <button
            v-if="!disabled"
            type="button"
            @click="removeUploadedFile"
            class="text-[#ff6b6d] hover:text-[#ff4c4f] text-xs font-hack px-2 py-1 rounded hover:bg-white/5 transition-colors"
          >
            Hapus
          </button>
        </div>

        <div v-else class="relative">
          <label
            :class="[
              'flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors',
              error ? 'border-[#ff6b6d] bg-[#ff6b6d]/5' : 'border-white/20 hover:border-[#E5383B] bg-[#1d2226]/40 hover:bg-[#1d2226]',
              (disabled || isUploading) && 'opacity-60 cursor-not-allowed',
            ]"
          >
            <div class="flex flex-col items-center justify-center text-center">
              <svg class="w-8 h-8 mb-2 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-xs text-white/80 font-pt-sans mb-1">
                <span class="font-pt-sans-bold text-[#E5383B]">Klik untuk memilih berkas</span> atau tarik & lepas
              </p>
              <p class="text-[11px] text-white/40 font-hack">
                Maksimal 3 MB (Gambar terkompres otomatis, PDF, Dokumen, ZIP)
              </p>
            </div>
            <input
              type="file"
              class="hidden"
              :disabled="disabled || isUploading"
              @change="handleFileUpload"
            />
          </label>
        </div>

        <div v-if="isUploading" class="flex items-center gap-2 text-xs text-[#E5383B] font-hack">
          <svg class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          {{ UI_MESSAGES.publicForm.compressingImage }}
        </div>

        <p v-if="uploadError" class="text-xs text-[#ff6b6d] font-pt-sans">
          {{ uploadError }}
        </p>
      </div>

      <!-- Error Message -->
      <p v-if="error" class="text-xs text-[#ff6b6d] flex items-center gap-1 font-pt-sans mt-0.5">
        <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        {{ error }}
      </p>
    </div>
  </div>
</template>
