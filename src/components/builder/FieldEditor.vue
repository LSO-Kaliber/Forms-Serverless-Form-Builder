<script setup lang="ts">
import { computed } from 'vue';
import type { FormField, FormPage } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { isSafeRegex } from '@shared/presets';
import KaliberInput from '../common/KaliberInput.vue';
import KaliberButton from '../common/KaliberButton.vue';

interface Props {
  field: FormField;
  pages: FormPage[];
}

const props = defineProps<Props>();

// List of all other fields for condition picker
const otherFields = computed(() => {
  const result: { id: string; label: string }[] = [];
  for (const page of props.pages) {
    for (const f of page.fields) {
      if (f.id !== props.field.id && f.type !== 'info') {
        result.push({ id: f.id, label: `${f.label} (${f.id})` });
      }
    }
  }
  return result;
});

// Options handling
function addOption() {
  if (!props.field.options) props.field.options = [];
  const count = props.field.options.length + 1;
  props.field.options.push({
    id: `opt_${crypto.randomUUID().slice(0, 6)}`,
    label: `Opsi ${count}`,
    value: `opsi_${count}`,
  });
}

function removeOption(index: number) {
  if (props.field.options && props.field.options.length > 1) {
    props.field.options.splice(index, 1);
  }
}

// Validation rules ensure defaults
if (!props.field.validation) {
  props.field.validation = {};
}

// Visibility conditions
function enableVisibility() {
  if (!props.field.visibleIf) {
    props.field.visibleIf = {
      logicalOperator: 'AND',
      conditions: otherFields.value.length > 0 ? [{ fieldId: otherFields.value[0].id, operator: 'eq', value: '' }] : [],
    };
  }
}

function disableVisibility() {
  props.field.visibleIf = undefined;
}

function addCondition() {
  if (!props.field.visibleIf) enableVisibility();
  if (props.field.visibleIf && otherFields.value.length > 0) {
    props.field.visibleIf.conditions.push({
      fieldId: otherFields.value[0].id,
      operator: 'eq',
      value: '',
    });
  }
}

function removeCondition(index: number) {
  if (props.field.visibleIf) {
    props.field.visibleIf.conditions.splice(index, 1);
    if (props.field.visibleIf.conditions.length === 0) {
      props.field.visibleIf = undefined;
    }
  }
}

const regexCheck = computed(() => {
  if (props.field.type !== 'custom_regex' || !props.field.validation?.pattern) return { valid: true };
  return isSafeRegex(props.field.validation.pattern);
});
</script>

<template>
  <div class="flex flex-col gap-6 text-sm text-white">
    <!-- Basic settings -->
    <div class="flex flex-col gap-4">
      <KaliberInput
        label="Label Pertanyaan"
        v-model="field.label"
        placeholder="Masukkan pertanyaan..."
        required
      />

      <KaliberInput
        label="Teks Bantuan (Help Text)"
        v-model="field.helpText"
        placeholder="Petunjuk tambahan untuk responden..."
      />

      <KaliberInput
        v-if="['text', 'paragraph', 'number', 'link'].includes(field.type)"
        label="Placeholder (Teks Contoh)"
        v-model="field.placeholder"
        placeholder="Teks contoh dalam kolom..."
      />

      <div class="flex items-center gap-3 pt-1">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="field.required"
            class="w-4 h-4 rounded text-[#E5383B] bg-[#1d2226] border-white/30 focus:ring-[#E5383B]"
          />
          <span class="font-hack text-xs text-white/90">Wajib Diisi (Required)</span>
        </label>
      </div>
    </div>

    <!-- Options editor for radio, checkbox, dropdown -->
    <div
      v-if="['radio', 'checkbox', 'dropdown'].includes(field.type)"
      class="pt-4 border-t border-white/10 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <h4 class="font-hack text-xs text-white/80 uppercase tracking-wider">
          {{ UI_MESSAGES.builder.optionsLabel }}
        </h4>
        <button
          type="button"
          @click="addOption"
          class="text-xs font-hack text-[#E5383B] hover:text-[#ff6b6d] flex items-center gap-1"
        >
          + Tambah Opsi
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="(opt, idx) in field.options || []"
          :key="opt.id"
          class="flex items-center gap-2"
        >
          <input
            type="text"
            v-model="opt.label"
            placeholder="Label Pilihan"
            @input="opt.value = opt.label.toLowerCase().replace(/[^a-z0-9_-]/g, '_')"
            class="flex-1 bg-[#101316] border border-white/20 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#E5383B]"
          />
          <button
            type="button"
            @click="removeOption(idx)"
            class="text-white/40 hover:text-[#ff6b6d] text-sm px-2"
            title="Hapus opsi"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Regex Validation -->
    <div
      v-if="field.type === 'custom_regex'"
      class="pt-4 border-t border-white/10 flex flex-col gap-3"
    >
      <h4 class="font-hack text-xs text-white/80 uppercase tracking-wider">
        Pengaturan Pola Regex
      </h4>
      <KaliberInput
        label="Pola Regex (Harus diawali ^ dan diakhiri $)"
        v-model="field.validation!.pattern"
        placeholder="Contoh: ^[A-Z0-9]{5,10}$"
        :error="!regexCheck.valid ? regexCheck.error : ''"
      />
      <KaliberInput
        label="Pesan Error Kustom"
        v-model="field.validation!.patternError"
        placeholder="Pesan yang ditampilkan jika input tidak sesuai pola..."
      />
    </div>

    <!-- Link Domain Restriction -->
    <div
      v-if="field.type === 'link'"
      class="pt-4 border-t border-white/10 flex flex-col gap-3"
    >
      <h4 class="font-hack text-xs text-white/80 uppercase tracking-wider">
        Batasan Domain (Opsional)
      </h4>
      <input
        type="text"
        :value="(field.validation?.allowedDomains || []).join(', ')"
        @input="field.validation!.allowedDomains = ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)"
        placeholder="Contoh: github.com, drive.google.com"
        class="bg-[#101316] border border-white/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-[#E5383B]"
      />
      <span class="text-[11px] text-white/50">Pisahkan dengan koma jika lebih dari satu domain. Kosongkan untuk menerima semua tautan.</span>
    </div>

    <!-- File Upload Restrictions -->
    <div
      v-if="field.type === 'file'"
      class="pt-4 border-t border-white/10 flex flex-col gap-3"
    >
      <h4 class="font-hack text-xs text-white/80 uppercase tracking-wider">
        Batasan Berkas
      </h4>
      <div class="flex items-center gap-4 text-xs">
        <span>Maksimal 3 MB per berkas (Batas Cloudflare Free Tier).</span>
      </div>
    </div>

    <!-- Branching Logic (visibleIf) -->
    <div class="pt-4 border-t border-white/10 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-hack text-xs text-white/80 uppercase tracking-wider">
            Logika Tampil Bercabang (visibleIf)
          </h4>
          <p class="text-[11px] text-white/50">Tampilkan kolom ini hanya jika kondisi tertentu terpenuhi</p>
        </div>
        <button
          v-if="!field.visibleIf"
          type="button"
          @click="enableVisibility"
          class="text-xs font-hack text-[#E5383B] hover:text-[#ff6b6d]"
        >
          + Tambah Kondisi
        </button>
        <button
          v-else
          type="button"
          @click="disableVisibility"
          class="text-xs font-hack text-[#ff6b6d] hover:text-[#ff4c4f]"
        >
          Hapus Aturan
        </button>
      </div>

      <div v-if="field.visibleIf" class="p-3 rounded-lg bg-black/40 border border-white/10 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-hack text-white/60">Operator Logika:</span>
          <select
            v-model="field.visibleIf.logicalOperator"
            class="bg-[#1d2226] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none"
          >
            <option value="AND">DAN (Semua kondisi harus terpenuhi)</option>
            <option value="OR">ATAU (Salah satu kondisi terpenuhi)</option>
          </select>
        </div>

        <div
          v-for="(cond, cIdx) in field.visibleIf.conditions"
          :key="cIdx"
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-white/5 pb-2"
        >
          <!-- Field Selector -->
          <select
            v-model="cond.fieldId"
            class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none flex-1"
          >
            <option v-for="f in otherFields" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>

          <!-- Operator Selector -->
          <select
            v-model="cond.operator"
            class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none w-28"
          >
            <option value="eq">Sama dengan</option>
            <option value="neq">Tidak sama dengan</option>
            <option value="contains">Mengandung</option>
            <option value="notEmpty">Tidak kosong</option>
            <option value="empty">Kosong</option>
          </select>

          <!-- Value input if not empty/notEmpty -->
          <input
            v-if="!['empty', 'notEmpty'].includes(cond.operator)"
            type="text"
            v-model="cond.value"
            placeholder="Nilai perbandingan"
            class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none flex-1"
          />

          <button
            type="button"
            @click="removeCondition(cIdx)"
            class="text-white/40 hover:text-[#ff6b6d] text-sm px-1"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          @click="addCondition"
          class="text-xs font-hack text-[#E5383B] hover:underline self-start"
        >
          + Tambah Baris Kondisi
        </button>
      </div>
    </div>
  </div>
</template>
