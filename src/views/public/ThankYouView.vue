<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { UI_MESSAGES } from '@shared/messages';
import KaliberButton from '@/components/common/KaliberButton.vue';

const route = useRoute();
const editToken = computed(() => route.query.token as string | undefined);
const customThankYou = computed(() => route.query.thankYou as string | undefined);

const editUrl = computed(() => {
  if (!editToken.value) return '';
  return `${window.location.origin}/e/${editToken.value}`;
});

const copied = ref(false);

function copyLink() {
  if (!editUrl.value) return;
  navigator.clipboard.writeText(editUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 3000);
}

function downloadReceipt() {
  const content = `BUKTI PENGISIAN FORMULIR KALIBER
----------------------------------------
Waktu: ${new Date().toLocaleString('id-ID')}
Token Edit: ${editToken.value || '-'}
Tautan Edit: ${editUrl.value || '-'}

Harap simpan bukti ini dengan baik.
© 2026 LSO Kaliber
`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bukti_Pengisian_Kaliber_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-[#101316]">
    <div class="max-w-lg w-full kaliber-card-solid rounded-2xl p-8 border border-white/15 text-center flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
      <!-- Glow accent -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C83338] via-[#E5383B] to-[#291C33]"></div>

      <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-3xl shadow-inner">
        ✓
      </div>

      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-pt-sans-bold text-white tracking-wide">
          {{ UI_MESSAGES.publicForm.submitSuccessTitle }}
        </h1>
        <p class="text-sm text-white/70 leading-relaxed font-pt-sans">
          {{ customThankYou || UI_MESSAGES.publicForm.defaultThankYou }}
        </p>
      </div>

      <!-- Edit link container if edit allowed -->
      <div v-if="editToken" class="w-full p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3 text-left">
        <p class="text-xs font-hack text-white/80">
          {{ UI_MESSAGES.publicForm.editLinkInfo }}
        </p>

        <div class="p-2.5 rounded bg-[#101316] border border-white/15 font-hack text-xs text-[#E5383B] break-all select-all">
          {{ editUrl }}
        </div>

        <div class="flex items-center gap-2 pt-1">
          <KaliberButton variant="primary" class="flex-1 text-xs" @click="copyLink">
            <span>📋</span>
            {{ copied ? UI_MESSAGES.common.copied : UI_MESSAGES.publicForm.copyEditLink }}
          </KaliberButton>
          <KaliberButton variant="secondary" class="flex-1 text-xs" @click="downloadReceipt">
            <span>📥</span>
            {{ UI_MESSAGES.publicForm.downloadReceipt }}
          </KaliberButton>
        </div>
      </div>

      <div class="pt-4 border-t border-white/10 w-full text-xs font-hack text-white/40">
        {{ UI_MESSAGES.app.organization }}
      </div>
    </div>
  </div>
</template>
