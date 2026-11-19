<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { FormField, FormRecord, FormSchema } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { formatDateJakarta } from '@/utils/formatters';
import { exportResponsesToSpreadsheet } from '@/utils/export';
import KaliberNavbar from '@/components/common/KaliberNavbar.vue';
import KaliberFooter from '@/components/common/KaliberFooter.vue';
import KaliberButton from '@/components/common/KaliberButton.vue';
import KaliberModal from '@/components/common/KaliberModal.vue';

const route = useRoute();
const formId = computed(() => route.params.id as string);

const form = ref<FormRecord | null>(null);
const schema = ref<FormSchema>({ pages: [] });
const responses = ref<any[]>([]);
const totalResponses = ref(0);
const isLoading = ref(true);

// Search & filters
const globalSearch = ref('');
const columnFilters = ref<Record<string, string>>({});
const visibleColumnIds = ref<Set<string>>(new Set());

// Sorting
const sortField = ref<string>('submitted_at');
const sortDirection = ref<'asc' | 'desc'>('desc');

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
}

// Detail panel
const selectedResponse = ref<any | null>(null);
const showDetailModal = ref(false);

// Regenerate token modal
const showRegenerateModal = ref(false);
const regeneratedToken = ref('');
const isRegenerating = ref(false);
const regeneratedUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/e/${regeneratedToken.value}`;
  }
  return `/e/${regeneratedToken.value}`;
});

// Delete modal
const showDeleteModal = ref(false);
const responseToDelete = ref<any | null>(null);
const isDeleting = ref(false);

// Schema field list
const allFields = computed<FormField[]>(() => {
  const list: FormField[] = [];
  for (const p of schema.value.pages) {
    for (const f of p.fields) {
      if (f.type !== 'info') list.push(f);
    }
  }
  return list;
});

async function fetchData() {
  isLoading.value = true;
  try {
    // 1. Fetch form
    const formRes = await fetch(`/api/admin/forms/${formId.value}`);
    if (formRes.ok) {
      const formData = await formRes.json();
      form.value = formData.form;
      try {
        schema.value = JSON.parse(formData.form.draft_schema_json);
      } catch {}
    }

    // 2. Fetch responses
    const respRes = await fetch(`/api/admin/forms/${formId.value}/responses?limit=500`);
    if (respRes.ok) {
      const data = await respRes.json();
      responses.value = data.responses || [];
      totalResponses.value = data.total || 0;
    }

    // Initialize visible columns
    const initialCols = new Set<string>();
    allFields.value.slice(0, 5).forEach((f) => initialCols.add(f.id));
    visibleColumnIds.value = initialCols;
  } catch (err) {
    console.error('Gagal memuat tanggapan:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchData();
});

// Client-side filtering & search
const filteredResponses = computed(() => {
  return responses.value.filter((r) => {
    // Global search
    if (globalSearch.value.trim()) {
      const q = globalSearch.value.toLowerCase();
      const matchUnique = (r.unique_key || '').toLowerCase().includes(q);
      const matchAnswers = Object.values(r.answers || {}).some((v) =>
        String(v).toLowerCase().includes(q)
      );
      if (!matchUnique && !matchAnswers) return false;
    }

    // Column-specific filters
    for (const [fieldId, filterVal] of Object.entries(columnFilters.value)) {
      if (!filterVal || !filterVal.trim()) continue;
      const ansVal = r.answers?.[fieldId];
      if (ansVal === undefined || ansVal === null) return false;
      const q = filterVal.toLowerCase();
      if (!String(ansVal).toLowerCase().includes(q)) return false;
    }

    return true;
  });
});

function toggleColumn(fieldId: string) {
  if (visibleColumnIds.value.has(fieldId)) {
    visibleColumnIds.value.delete(fieldId);
  } else {
    visibleColumnIds.value.add(fieldId);
  }
}

function handleExport(format: 'xlsx' | 'csv') {
  if (!form.value) return;
  exportResponsesToSpreadsheet(
    filteredResponses.value,
    schema.value,
    form.value.title,
    format
  );
}

function openDetail(r: any) {
  selectedResponse.value = r;
  showDetailModal.value = true;
}

function confirmDelete(r: any) {
  responseToDelete.value = r;
  showDeleteModal.value = true;
}

async function handleDeleteResponse() {
  if (!responseToDelete.value) return;
  isDeleting.value = true;
  try {
    const res = await fetch(`/api/admin/responses/${responseToDelete.value.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showDeleteModal.value = false;
      responseToDelete.value = null;
      await fetchData();
    }
  } catch {
    alert('Gagal menghapus tanggapan.');
  } finally {
    isDeleting.value = false;
  }
}

async function handleRegenerateToken(responseId: string) {
  isRegenerating.value = true;
  try {
    const res = await fetch(`/api/admin/responses/${responseId}/regenerate-token`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      regeneratedToken.value = data.newToken;
      showRegenerateModal.value = true;
    }
  } catch {
    alert('Gagal membuat ulang token edit.');
  } finally {
    isRegenerating.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316]">
    <KaliberNavbar />

    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <router-link to="/admin" class="text-white/50 hover:text-white text-sm">
              ←
            </router-link>
            <h1 class="text-2xl sm:text-3xl font-pt-sans-bold text-white tracking-tight">
              {{ form?.title || UI_MESSAGES.responses.title }}
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-white/60 font-hack mt-1">
            Total {{ filteredResponses.length }} tanggapan (dari {{ totalResponses }} total masuk)
          </p>
        </div>

        <!-- Export Buttons -->
        <div class="flex items-center gap-2">
          <KaliberButton variant="secondary" @click="handleExport('csv')">
            <span>📄</span>
            {{ UI_MESSAGES.responses.exportCsv }}
          </KaliberButton>
          <KaliberButton variant="primary" @click="handleExport('xlsx')">
            <span>📊</span>
            {{ UI_MESSAGES.responses.exportXlsx }}
          </KaliberButton>
        </div>
      </div>

      <!-- Controls: Search & Columns Toggle -->
      <div class="kaliber-card-solid rounded-xl p-4 flex flex-col gap-3 border border-white/10">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <input
            type="text"
            v-model="globalSearch"
            :placeholder="UI_MESSAGES.responses.searchPlaceholder"
            class="bg-[#101316] border border-white/20 rounded-md px-3.5 py-2 text-xs sm:text-sm text-white outline-none focus:border-[#E5383B] flex-1"
          />

          <!-- Column Visibility Dropdown / Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto text-xs font-hack">
            <span class="text-white/40 shrink-0">Kolom:</span>
            <button
              v-for="field in allFields"
              :key="field.id"
              type="button"
              @click="toggleColumn(field.id)"
              :class="[
                'px-2.5 py-1 rounded transition-colors whitespace-nowrap text-[11px]',
                visibleColumnIds.has(field.id)
                  ? 'bg-[#C83338]/40 border border-[#C83338] text-white'
                  : 'bg-white/5 text-white/40 hover:text-white border border-white/10',
              ]"
            >
              {{ field.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="kaliber-card-solid rounded-xl border border-white/10 overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-black/40 text-white/70 font-hack uppercase text-[11px] border-b border-white/10 tracking-wider">
              <tr>
                <th class="px-4 py-3.5">#</th>
                <th class="px-4 py-3.5">{{ UI_MESSAGES.responses.submittedAt }}</th>
                <th v-if="form?.unique_field_id" class="px-4 py-3.5">{{ UI_MESSAGES.responses.uniqueKey }}</th>
                <th
                  v-for="field in allFields.filter(f => visibleColumnIds.has(f.id))"
                  :key="field.id"
                  class="px-4 py-3.5"
                >
                  <div class="flex flex-col gap-1">
                    <span>{{ field.label }}</span>
                    <!-- Column Filter Input -->
                    <input
                      type="text"
                      :placeholder="`Saring...`"
                      :value="columnFilters[field.id] || ''"
                      @input="columnFilters[field.id] = ($event.target as HTMLInputElement).value"
                      class="bg-[#101316] border border-white/20 rounded px-2 py-0.5 text-[10px] text-white font-normal lowercase outline-none"
                    />
                  </div>
                </th>
                <th class="px-4 py-3.5 text-right">{{ UI_MESSAGES.common.actions }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-if="isLoading">
                <td :colspan="10" class="px-4 py-12 text-center text-white/40 font-hack">
                  {{ UI_MESSAGES.common.loading }}
                </td>
              </tr>
              <tr v-else-if="filteredResponses.length === 0">
                <td :colspan="10" class="px-4 py-12 text-center text-white/40 font-hack">
                  {{ UI_MESSAGES.common.noData }}
                </td>
              </tr>
              <tr
                v-else
                v-for="(r, idx) in filteredResponses"
                :key="r.id"
                class="hover:bg-white/5 transition-colors"
              >
                <td class="px-4 py-3 font-hack text-white/50">{{ idx + 1 }}</td>
                <td class="px-4 py-3 font-hack text-white/80 whitespace-nowrap">
                  {{ formatDateJakarta(r.submitted_at) }}
                </td>
                <td v-if="form?.unique_field_id" class="px-4 py-3 font-hack text-[#E5383B]">
                  {{ r.unique_key || '-' }}
                </td>
                <td
                  v-for="field in allFields.filter(f => visibleColumnIds.has(f.id))"
                  :key="field.id"
                  class="px-4 py-3 max-w-xs truncate text-white/90"
                >
                  <template v-if="field.type === 'file'">
                    <span v-if="r.answers?.[field.id]" class="text-xs text-[#E5383B] underline font-hack">
                      📎 {{ typeof r.answers[field.id] === 'object' ? r.answers[field.id].filename : 'Berkas' }}
                    </span>
                    <span v-else class="text-white/30">-</span>
                  </template>
                  <template v-else-if="Array.isArray(r.answers?.[field.id])">
                    {{ r.answers[field.id].join(', ') }}
                  </template>
                  <template v-else>
                    {{ r.answers?.[field.id] ?? '-' }}
                  </template>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      @click="openDetail(r)"
                      class="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white text-xs font-hack transition-colors"
                      title="Lihat Detail"
                    >
                      Detail
                    </button>
                    <button
                      v-if="form?.allow_edit"
                      type="button"
                      @click="handleRegenerateToken(r.id)"
                      class="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-hack transition-colors"
                      title="Buat Ulang Link Edit"
                    >
                      🔑
                    </button>
                    <button
                      type="button"
                      @click="confirmDelete(r)"
                      class="p-1 rounded text-[#ff6b6d]/70 hover:text-[#ff6b6d] hover:bg-white/5 text-xs transition-colors"
                      title="Hapus Tanggapan"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Detail Modal -->
    <KaliberModal
      :show="showDetailModal"
      title="Detail Tanggapan Masuk"
      confirm-text="Tutup"
      @close="showDetailModal = false"
      @confirm="showDetailModal = false"
    >
      <div v-if="selectedResponse" class="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
        <div class="p-3 rounded-lg bg-black/40 border border-white/10 flex flex-col gap-1 text-xs font-hack">
          <div><span class="text-white/50">Waktu Kirim:</span> {{ formatDateJakarta(selectedResponse.submitted_at) }}</div>
          <div v-if="selectedResponse.unique_key"><span class="text-white/50">Kunci Unik / NIM:</span> <span class="text-[#E5383B]">{{ selectedResponse.unique_key }}</span></div>
          <div><span class="text-white/50">Versi Schema:</span> v{{ selectedResponse.form_version }}</div>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="field in allFields"
            :key="field.id"
            class="p-3 rounded-lg bg-[#101316] border border-white/10 flex flex-col gap-1"
          >
            <span class="text-xs font-hack text-white/50">{{ field.label }}</span>
            <div class="text-sm font-pt-sans text-white">
              <template v-if="field.type === 'file'">
                <div v-if="selectedResponse.answers?.[field.id]">
                  <a
                    v-if="selectedResponse.files?.find((f: any) => f.field_id === field.id)"
                    :href="selectedResponse.files.find((f: any) => f.field_id === field.id).download_url"
                    target="_blank"
                    class="inline-flex items-center gap-1.5 text-xs text-[#E5383B] hover:underline font-hack bg-white/5 px-2.5 py-1.5 rounded border border-white/10"
                  >
                    <span>📥</span> Unduh {{ selectedResponse.files.find((f: any) => f.field_id === field.id).filename }}
                  </a>
                  <span v-else class="text-xs text-white/70">
                    {{ typeof selectedResponse.answers[field.id] === 'object' ? selectedResponse.answers[field.id].filename : 'Berkas terlampir' }}
                  </span>
                </div>
                <span v-else class="text-white/30 text-xs">-</span>
              </template>
              <template v-else-if="Array.isArray(selectedResponse.answers?.[field.id])">
                {{ selectedResponse.answers[field.id].join(', ') }}
              </template>
              <template v-else>
                {{ selectedResponse.answers?.[field.id] || '-' }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </KaliberModal>

    <!-- Regenerated Token Modal -->
    <KaliberModal
      :show="showRegenerateModal"
      title="Tautan Edit Berhasil Dibuat Ulang"
      confirm-text="Salin & Tutup"
      @close="showRegenerateModal = false"
      @confirm="showRegenerateModal = false"
    >
      <div class="flex flex-col gap-3">
        <p class="text-xs text-white/80">
          Token edit lama telah hangus. Berikan tautan edit baru berikut kepada responden:
        </p>
        <div class="p-3 bg-black/60 rounded-lg border border-white/20 font-hack text-xs text-[#E5383B] break-all select-all">
          {{ regeneratedUrl }}
        </div>
      </div>
    </KaliberModal>

    <!-- Delete Confirmation Modal -->
    <KaliberModal
      :show="showDeleteModal"
      title="Hapus Tanggapan Responden"
      confirm-text="Ya, Hapus Permanen"
      is-danger
      :loading="isDeleting"
      @close="showDeleteModal = false"
      @confirm="handleDeleteResponse"
    >
      <p>
        {{ UI_MESSAGES.responses.deleteConfirm }}
      </p>
    </KaliberModal>

    <KaliberFooter />
  </div>
</template>
