<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { FormRecord } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import { formatDateShort } from '@/utils/formatters';
import KaliberNavbar from '@/components/common/KaliberNavbar.vue';
import KaliberFooter from '@/components/common/KaliberFooter.vue';
import KaliberButton from '@/components/common/KaliberButton.vue';
import KaliberBadge from '@/components/common/KaliberBadge.vue';
import KaliberModal from '@/components/common/KaliberModal.vue';

const router = useRouter();
const forms = ref<FormRecord[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const statusFilter = ref<'all' | 'draft' | 'published' | 'closed'>('all');

// Create form modal state
const showCreateModal = ref(false);
const newTitle = ref('');
const newSlug = ref('');
const isCreating = ref(false);

// Delete modal state
const showDeleteModal = ref(false);
const formToDelete = ref<FormRecord | null>(null);
const isDeleting = ref(false);

async function fetchForms() {
  isLoading.value = true;
  try {
    const res = await fetch('/api/admin/forms');
    if (res.ok) {
      const data = await res.json();
      forms.value = data.forms || [];
    }
  } catch (err) {
    console.error('Gagal mengambil daftar form:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchForms();
});

const filteredForms = computed(() => {
  return forms.value.filter((f) => {
    const matchSearch =
      f.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      f.slug.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchStatus = statusFilter.value === 'all' || f.status === statusFilter.value;
    return matchSearch && matchStatus;
  });
});

async function handleCreateForm() {
  if (!newTitle.value.trim()) return;
  isCreating.value = true;
  try {
    const res = await fetch('/api/admin/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.value,
        slug: newSlug.value ? newSlug.value.toLowerCase() : undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      showCreateModal.value = false;
      newTitle.value = '';
      newSlug.value = '';
      router.push(`/admin/forms/${data.form.id}/builder`);
    } else {
      alert('Gagal membuat formulir. Periksa format judul dan slug.');
    }
  } catch {
    alert('Terjadi kesalahan jaringan.');
  } finally {
    isCreating.value = false;
  }
}

async function handleDuplicate(formId: string) {
  try {
    const res = await fetch(`/api/admin/forms/${formId}/duplicate`, { method: 'POST' });
    if (res.ok) {
      await fetchForms();
    }
  } catch {
    alert('Gagal menduplikasi formulir.');
  }
}

function confirmDelete(form: FormRecord) {
  formToDelete.value = form;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!formToDelete.value) return;
  isDeleting.value = true;
  try {
    const res = await fetch(`/api/admin/forms/${formToDelete.value.id}`, { method: 'DELETE' });
    if (res.ok) {
      showDeleteModal.value = false;
      formToDelete.value = null;
      await fetchForms();
    }
  } catch {
    alert('Gagal menghapus formulir.');
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316]">
    <KaliberNavbar />

    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <!-- Top Header & Action -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-pt-sans-bold text-white tracking-tight">
            {{ UI_MESSAGES.nav.forms }}
          </h1>
          <p class="text-xs sm:text-sm text-white/60 font-hack mt-1">
            Kelola seluruh formulir, kuota pendaftaran, dan data tanggapan organisasi
          </p>
        </div>

        <KaliberButton variant="primary" @click="showCreateModal = true">
          <span class="text-base leading-none">+</span>
          Buat Formulir Baru
        </KaliberButton>
      </div>

      <!-- Search & Filters Bar -->
      <div class="kaliber-card-solid rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-white/10">
        <div class="relative flex-1">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Cari berdasarkan judul atau slug..."
            class="w-full bg-[#101316] border border-white/20 rounded-md px-3.5 py-2 text-xs sm:text-sm text-white outline-none focus:border-[#E5383B]"
          />
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto text-xs font-hack">
          <button
            type="button"
            @click="statusFilter = 'all'"
            :class="[
              'px-3 py-1.5 rounded transition-colors whitespace-nowrap',
              statusFilter === 'all' ? 'bg-[#C83338] text-white' : 'bg-white/5 text-white/60 hover:text-white',
            ]"
          >
            Semua ({{ forms.length }})
          </button>
          <button
            type="button"
            @click="statusFilter = 'published'"
            :class="[
              'px-3 py-1.5 rounded transition-colors whitespace-nowrap',
              statusFilter === 'published' ? 'bg-[#C83338] text-white' : 'bg-white/5 text-white/60 hover:text-white',
            ]"
          >
            Dipublikasikan
          </button>
          <button
            type="button"
            @click="statusFilter = 'draft'"
            :class="[
              'px-3 py-1.5 rounded transition-colors whitespace-nowrap',
              statusFilter === 'draft' ? 'bg-[#C83338] text-white' : 'bg-white/5 text-white/60 hover:text-white',
            ]"
          >
            Draf
          </button>
          <button
            type="button"
            @click="statusFilter = 'closed'"
            :class="[
              'px-3 py-1.5 rounded transition-colors whitespace-nowrap',
              statusFilter === 'closed' ? 'bg-[#C83338] text-white' : 'bg-white/5 text-white/60 hover:text-white',
            ]"
          >
            Ditutup
          </button>
        </div>
      </div>

      <!-- Form Cards Grid -->
      <div v-if="isLoading" class="p-12 text-center text-white/40 text-sm font-hack">
        {{ UI_MESSAGES.common.loading }}
      </div>

      <div
        v-else-if="filteredForms.length === 0"
        class="kaliber-card-solid p-12 text-center rounded-xl border border-white/10 text-white/50 flex flex-col items-center gap-3"
      >
        <span class="text-3xl">📋</span>
        <p class="font-pt-sans text-sm">{{ UI_MESSAGES.common.noData }}</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="form in filteredForms"
          :key="form.id"
          class="kaliber-card-solid rounded-xl p-5 border border-white/10 hover:border-white/30 flex flex-col justify-between gap-4 transition-all duration-200 group"
        >
          <!-- Card Top -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <KaliberBadge :status="form.status" />
              <span class="text-[11px] font-hack text-white/40">
                v{{ form.current_version }} &bull; {{ formatDateShort(form.created_at) }}
              </span>
            </div>

            <router-link
              :to="`/admin/forms/${form.id}/builder`"
              class="font-pt-sans-bold text-lg text-white hover:text-[#E5383B] transition-colors line-clamp-2 mt-1"
            >
              {{ form.title }}
            </router-link>

            <p class="text-xs font-hack text-white/50 truncate">
              /forms/{{ form.slug }}
            </p>
          </div>

          <!-- Card Middle: Stats -->
          <div class="py-2.5 px-3 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between text-xs font-hack">
            <span class="text-white/60">Tanggapan Masuk</span>
            <span class="font-pt-sans-bold text-[#E5383B] text-sm">
              {{ form.response_count ?? 0 }}
              <span v-if="form.max_responses" class="text-xs text-white/40 font-normal">
                / {{ form.max_responses }}
              </span>
            </span>
          </div>

          <!-- Card Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
            <div class="flex items-center gap-2">
              <router-link
                :to="`/admin/forms/${form.id}/builder`"
                class="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/15 text-white font-hack transition-colors"
                title="Buka Builder"
              >
                ✏️ Edit
              </router-link>

              <router-link
                :to="`/admin/forms/${form.id}/responses`"
                class="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/15 text-white font-hack transition-colors"
                title="Lihat Tanggapan"
              >
                📊 Tanggapan
              </router-link>

              <a
                v-if="form.status === 'published'"
                :href="`/forms/${form.slug}`"
                target="_blank"
                class="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/15 text-white font-hack transition-colors"
                title="Buka Form Publik"
              >
                🔗 Buka
              </a>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="handleDuplicate(form.id)"
                class="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/5"
                title="Duplikat Formulir"
              >
                📋
              </button>
              <button
                type="button"
                @click="confirmDelete(form)"
                class="p-1.5 text-[#ff6b6d]/60 hover:text-[#ff6b6d] rounded hover:bg-white/5"
                title="Hapus Formulir"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Form Modal -->
    <KaliberModal
      :show="showCreateModal"
      title="Buat Formulir Baru"
      confirm-text="Buat & Buka Builder"
      :loading="isCreating"
      @close="showCreateModal = false"
      @confirm="handleCreateForm"
    >
      <div class="flex flex-col gap-4">
        <KaliberInput
          label="Judul Formulir"
          v-model="newTitle"
          placeholder="Contoh: Pendaftaran Divisi Cyber Security 2026"
          required
        />
        <KaliberInput
          label="Tautan Kustom / Slug (Opsional)"
          v-model="newSlug"
          placeholder="Contoh: oprec-cyber-2026"
          help-text="Bisa diubah kembali nanti di pengaturan builder."
        />
      </div>
    </KaliberModal>

    <!-- Delete Confirmation Modal -->
    <KaliberModal
      :show="showDeleteModal"
      title="Hapus Formulir Permanen"
      confirm-text="Ya, Hapus Semuanya"
      is-danger
      :loading="isDeleting"
      @close="showDeleteModal = false"
      @confirm="handleDelete"
    >
      <p>
        Apakah Anda yakin ingin menghapus formulir
        <strong class="text-white">"{{ formToDelete?.title }}"</strong>?
      </p>
      <p class="text-xs text-[#ff6b6d] mt-2">
        Tindakan ini akan menghapus formulir, seluruh riwayat versi, tanggapan yang masuk, serta berkas lampiran yang tersimpan di Cloudflare R2 secara permanen.
      </p>
    </KaliberModal>

    <KaliberFooter />
  </div>
</template>
