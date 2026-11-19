<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { FormPage, FormRecord } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { getErrorMessage } from '@shared/errors';
import KaliberInput from '../common/KaliberInput.vue';

interface Props {
  form: FormRecord;
  pages: FormPage[];
}

const props = defineProps<Props>();

const slugStatus = ref<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
const slugErrorMsg = ref('');
let debounceTimer: any = null;

// Unique field options (candidates for 1 response per NIM or unique answer)
const uniqueFieldCandidates = computed(() => {
  const result: { id: string; label: string }[] = [];
  for (const page of props.pages) {
    for (const f of page.fields) {
      if (['nim_umm', 'email_umm', 'text', 'email', 'number'].includes(f.type)) {
        result.push({ id: f.id, label: `${f.label} [${f.type}]` });
      }
    }
  }
  return result;
});

function checkSlugRealtime(slug: string) {
  if (!slug || slug === props.form.slug) {
    slugStatus.value = 'idle';
    slugErrorMsg.value = '';
    return;
  }

  clearTimeout(debounceTimer);
  slugStatus.value = 'checking';

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/admin/check-slug?slug=${encodeURIComponent(slug)}&excludeId=${props.form.id}`);
      const data = await res.json();
      if (data.available) {
        slugStatus.value = 'available';
        slugErrorMsg.value = '';
      } else {
        slugStatus.value = 'unavailable';
        slugErrorMsg.value = getErrorMessage(data.errorCode);
      }
    } catch {
      slugStatus.value = 'idle';
    }
  }, 400);
}

function formatToDatetimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

function handleDatetimeInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  if (!val) {
    props.form.closes_at = null;
    return;
  }
  const localDate = new Date(val);
  if (!isNaN(localDate.getTime())) {
    props.form.closes_at = localDate.toISOString();
  }
}

watch(
  () => props.form.slug,
  (newSlug) => {
    props.form.slug = (newSlug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    checkSlugRealtime(props.form.slug);
  }
);
</script>

<template>
  <div class="flex flex-col gap-6 text-sm text-white max-w-2xl">
    <!-- Title & Description -->
    <div class="flex flex-col gap-4">
      <KaliberInput
        label="Judul Formulir"
        v-model="form.title"
        placeholder="Judul formulir..."
        required
      />

      <KaliberInput
        label="Deskripsi Formulir"
        v-model="form.description"
        placeholder="Deskripsi atau instruksi umum pengisian formulir..."
        type="textarea"
      />
    </div>

    <!-- Slug Configuration with Real-time Check -->
    <div class="pt-4 border-t border-white/10 flex flex-col gap-2">
      <label class="text-sm font-hack text-white/95">
        {{ UI_MESSAGES.builder.slugLabel }}
      </label>
      <div class="relative flex items-center">
        <span class="bg-black/40 border border-r-0 border-white/20 rounded-l-md px-3 py-2.5 text-xs text-white/50 font-hack">
          /forms/
        </span>
        <input
          type="text"
          v-model="form.slug"
          placeholder="pendaftaran-lso-kaliber"
          class="w-full min-h-[44px] bg-[#1d2226] text-white rounded-r-md px-3 py-2.5 text-sm outline-none border border-white/20 focus:border-[#E5383B] font-hack"
        />
      </div>

      <!-- Real-time status feedback -->
      <div class="flex items-center gap-1.5 text-xs font-hack">
        <span v-if="slugStatus === 'checking'" class="text-white/50">Memeriksa ketersediaan...</span>
        <span v-else-if="slugStatus === 'available'" class="text-emerald-400 flex items-center gap-1">
          ✓ {{ UI_MESSAGES.builder.slugAvailable }}
        </span>
        <span v-else-if="slugStatus === 'unavailable'" class="text-[#ff6b6d] flex items-center gap-1">
          ✕ {{ slugErrorMsg || UI_MESSAGES.builder.slugUnavailable }}
        </span>
        <span v-else class="text-white/40">
          {{ UI_MESSAGES.builder.slugHelp }}
        </span>
      </div>
    </div>

    <!-- Quota & Closing Date -->
    <div class="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <KaliberInput
          :label="UI_MESSAGES.builder.maxResponsesLabel"
          type="number"
          v-model="form.max_responses"
          placeholder="Contoh: 100 (kosongkan jika tanpa batas)"
          help-text="Formulir otomatis ditolak jika jumlah tanggapan mencapai batas ini."
        />
      </div>

      <div>
        <label class="text-sm font-hack text-white/95 mb-1.5 block">
          {{ UI_MESSAGES.builder.closesAtLabel }}
        </label>
        <input
          type="datetime-local"
          :value="formatToDatetimeLocal(form.closes_at)"
          @input="handleDatetimeInput"
          class="w-full min-h-[44px] bg-[#1d2226] text-white rounded-md px-3.5 py-2.5 text-sm outline-none border border-white/20 focus:border-[#E5383B]"
        />
        <p class="text-xs text-white/50 mt-1">
          Waktu penutupan otomatis (akan dicek di server zona UTC).
        </p>
      </div>
    </div>

    <!-- Unique Field (e.g. 1 response per NIM) -->
    <div class="pt-4 border-t border-white/10 flex flex-col gap-2">
      <label class="text-sm font-hack text-white/95">
        {{ UI_MESSAGES.builder.uniqueFieldLabel }}
      </label>
      <select
        v-model="form.unique_field_id"
        class="w-full min-h-[44px] bg-[#1d2226] text-white rounded-md px-3.5 py-2.5 text-sm outline-none border border-white/20 focus:border-[#E5383B] cursor-pointer"
      >
        <option :value="null">{{ UI_MESSAGES.builder.uniqueFieldNone }}</option>
        <option v-for="c in uniqueFieldCandidates" :key="c.id" :value="c.id">
          {{ c.label }}
        </option>
      </select>
      <p class="text-xs text-white/50 leading-relaxed">
        Jika dipilih, setiap responden hanya dapat mengirim 1 kali untuk nilai unik ini (misal: 1 tanggapan per NIM). Pengisian duplikat akan ditolak oleh index database.
      </p>
    </div>

    <!-- Allow edit response -->
    <div class="pt-4 border-t border-white/10 flex flex-col gap-2">
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="form.allow_edit"
          class="w-4 h-4 rounded text-[#E5383B] bg-[#1d2226] border-white/30 focus:ring-[#E5383B]"
        />
        <span class="font-hack text-sm text-white/95">
          {{ UI_MESSAGES.builder.allowEditLabel }}
        </span>
      </label>
      <p class="text-xs text-white/50 pl-7 leading-relaxed">
        Responden akan diberikan tautan khusus bertoken untuk memperbarui jawaban mereka sebelum formulir ditutup.
      </p>
    </div>

    <!-- Custom Thank You Message -->
    <div class="pt-4 border-t border-white/10 flex flex-col gap-2">
      <KaliberInput
        :label="UI_MESSAGES.builder.customThankYouLabel"
        v-model="form.custom_thank_you"
        placeholder="Terima kasih telah berpartisipasi dalam pendaftaran LSO Kaliber..."
        type="textarea"
        help-text="Pesan yang ditampilkan kepada responden setelah berhasil mengirimkan formulir."
      />
    </div>

    <!-- Template toggle -->
    <div class="pt-4 border-t border-white/10 flex items-center gap-3">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="form.is_template"
          class="w-4 h-4 rounded text-[#E5383B] bg-[#1d2226] border-white/30 focus:ring-[#E5383B]"
        />
        <span class="font-hack text-xs text-white/90">
          Simpan Formulir ini sebagai Templat Organisasi
        </span>
      </label>
    </div>
  </div>
</template>
