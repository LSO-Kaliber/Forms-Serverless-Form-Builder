<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import { useFormBuilderStore } from '@/stores/formBuilder';
import type { FieldType, FormField } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';
import KaliberNavbar from '@/components/common/KaliberNavbar.vue';
import KaliberFooter from '@/components/common/KaliberFooter.vue';
import KaliberButton from '@/components/common/KaliberButton.vue';
import KaliberBadge from '@/components/common/KaliberBadge.vue';
import FieldEditor from '@/components/builder/FieldEditor.vue';
import LogicEditor from '@/components/builder/LogicEditor.vue';
import SettingsEditor from '@/components/builder/SettingsEditor.vue';
import FormRenderer from '@/components/form-renderer/FormRenderer.vue';

const route = useRoute();
const router = useRouter();
const builder = useFormBuilderStore();

const activeTab = ref<'fields' | 'logic' | 'settings' | 'preview'>('fields');
const showAddFieldMenu = ref(false);

const formId = computed(() => route.params.id as string);

onMounted(async () => {
  await builder.loadForm(formId.value);
});

const activePage = computed(() => {
  return builder.schema.pages.find((p) => p.id === builder.activePageId) || builder.schema.pages[0];
});

const activeField = computed(() => {
  if (!activePage.value || !builder.activeFieldId) return null;
  return activePage.value.fields.find((f) => f.id === builder.activeFieldId) || null;
});

const fieldTypeCategories: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Teks Singkat', icon: '📝' },
  { type: 'paragraph', label: 'Paragraf (Teks Panjang)', icon: '📄' },
  { type: 'number', label: 'Angka', icon: '🔢' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'nim_umm', label: 'NIM UMM (15 Digit)', icon: '🎓' },
  { type: 'email_umm', label: 'Webmail UMM', icon: '📧' },
  { type: 'custom_regex', label: 'Pola Kustom (Regex)', icon: '⚡' },
  { type: 'radio', label: 'Pilihan Tunggal (Radio)', icon: '🔘' },
  { type: 'checkbox', label: 'Kotak Centang (Banyak)', icon: '☑️' },
  { type: 'dropdown', label: 'Menu Turun (Dropdown)', icon: '🔽' },
  { type: 'date', label: 'Tanggal', icon: '📅' },
  { type: 'file', label: 'Unggah Berkas', icon: '📎' },
  { type: 'link', label: 'Tautan / URL', icon: '🔗' },
  { type: 'info', label: 'Blok Teks Info', icon: 'ℹ️' },
];

function selectField(fieldId: string) {
  builder.activeFieldId = fieldId;
}

function handleAddField(type: FieldType) {
  if (!activePage.value) return;
  const f = builder.addField(activePage.value.id, type);
  builder.activeFieldId = f.id;
  showAddFieldMenu.value = false;
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#101316]">
    <KaliberNavbar />

    <!-- Sub-header Toolbar -->
    <header class="sticky top-[69px] z-30 bg-[#161a1d] border-b border-white/10 px-4 sm:px-8 py-3">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <!-- Title and Status -->
        <div class="flex items-center gap-3">
          <router-link to="/admin" class="text-white/50 hover:text-white text-sm" title="Kembali">
            ←
          </router-link>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-pt-sans-bold text-white truncate max-w-xs sm:max-w-md">
                {{ builder.currentForm?.title || 'Memuat formulir...' }}
              </h2>
              <KaliberBadge v-if="builder.currentForm" :status="builder.currentForm.status" />
            </div>
            <p v-if="builder.currentForm" class="text-[11px] font-hack text-white/50 truncate">
              /forms/{{ builder.currentForm.slug }}
            </p>
          </div>
        </div>

        <!-- Builder Tabs & Actions -->
        <div class="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto justify-end">
          <!-- Tabs -->
          <div class="flex items-center bg-black/40 rounded-lg p-1 border border-white/10 text-xs font-hack">
            <button
              type="button"
              @click="activeTab = 'fields'"
              :class="[
                'px-3 py-1.5 rounded transition-colors',
                activeTab === 'fields' ? 'bg-[#C83338] text-white' : 'text-white/60 hover:text-white',
              ]"
            >
              {{ UI_MESSAGES.builder.fieldsTab }}
            </button>
            <button
              type="button"
              @click="activeTab = 'logic'"
              :class="[
                'px-3 py-1.5 rounded transition-colors',
                activeTab === 'logic' ? 'bg-[#C83338] text-white' : 'text-white/60 hover:text-white',
              ]"
            >
              {{ UI_MESSAGES.builder.logicTab }}
            </button>
            <button
              type="button"
              @click="activeTab = 'settings'"
              :class="[
                'px-3 py-1.5 rounded transition-colors',
                activeTab === 'settings' ? 'bg-[#C83338] text-white' : 'text-white/60 hover:text-white',
              ]"
            >
              {{ UI_MESSAGES.builder.settingsTab }}
            </button>
            <button
              type="button"
              @click="activeTab = 'preview'"
              :class="[
                'px-3 py-1.5 rounded transition-colors',
                activeTab === 'preview' ? 'bg-[#C83338] text-white' : 'text-white/60 hover:text-white',
              ]"
            >
              {{ UI_MESSAGES.builder.previewButton }}
            </button>
          </div>

          <!-- Save / Publish Actions -->
          <div class="flex items-center gap-2">
            <KaliberButton
              variant="secondary"
              :loading="builder.isSaving"
              @click="builder.saveDraft"
              title="Simpan Draf"
            >
              Simpan
            </KaliberButton>

            <KaliberButton
              v-if="builder.currentForm?.status !== 'published'"
              variant="primary"
              :loading="builder.isSaving"
              @click="builder.publish"
            >
              {{ UI_MESSAGES.builder.publishButton }}
            </KaliberButton>

            <KaliberButton
              v-else
              variant="secondary"
              @click="builder.closeForm"
            >
              {{ UI_MESSAGES.builder.closeFormButton }}
            </KaliberButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Feedback Alerts -->
    <div v-if="builder.errorMessage || builder.successMessage" class="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-4">
      <div
        v-if="builder.errorMessage"
        class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-[#ff6b6d] text-xs font-pt-sans flex items-center justify-between"
      >
        <span>⚠️ {{ builder.errorMessage }}</span>
        <button @click="builder.errorMessage = ''">✕</button>
      </div>
      <div
        v-if="builder.successMessage"
        class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-pt-sans flex items-center justify-between"
      >
        <span>✓ {{ builder.successMessage }}</span>
        <button @click="builder.successMessage = ''">✕</button>
      </div>
    </div>

    <!-- Warning if already has responses -->
    <div
      v-if="builder.currentForm && (builder.currentForm.response_count ?? 0) > 0"
      class="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-2"
    >
      <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-pt-sans flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ UI_MESSAGES.builder.warningExistingResponses }}</span>
      </div>
    </div>

    <!-- Main Builder Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <!-- TAB 1: Fields & Pages Editor -->
      <div v-if="activeTab === 'fields'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Pages & Fields Canvas (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-5">
          <!-- Page Tabs Bar -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
            <button
              v-for="(page, pIdx) in builder.schema.pages"
              :key="page.id"
              type="button"
              @click="builder.activePageId = page.id"
              :class="[
                'px-3.5 py-2 rounded-lg text-xs font-hack transition-colors flex items-center gap-2 whitespace-nowrap',
                builder.activePageId === page.id
                  ? 'bg-[#C83338] text-white shadow-md'
                  : 'bg-[#1d2226] text-white/70 hover:text-white border border-white/10',
              ]"
            >
              <span>{{ page.title || `Halaman ${pIdx + 1}` }}</span>
              <span
                v-if="builder.schema.pages.length > 1"
                @click.stop="builder.deletePage(page.id)"
                class="hover:text-black/80 font-bold ml-1"
                title="Hapus Halaman"
              >
                ✕
              </span>
            </button>

            <button
              type="button"
              @click="builder.addPage"
              class="px-3 py-2 rounded-lg border border-dashed border-white/30 text-white/60 hover:text-white hover:border-white/60 text-xs font-hack flex items-center gap-1 whitespace-nowrap"
            >
              + {{ UI_MESSAGES.builder.addPage }}
            </button>
          </div>

          <!-- Page Meta Inputs -->
          <div v-if="activePage" class="kaliber-card-solid p-4 rounded-xl border border-white/10 flex flex-col gap-3">
            <input
              type="text"
              v-model="activePage.title"
              placeholder="Judul Halaman..."
              class="bg-transparent text-lg font-pt-sans-bold text-white outline-none border-b border-transparent focus:border-[#E5383B] pb-1"
            />
            <input
              type="text"
              v-model="activePage.description"
              placeholder="Deskripsi halaman (opsional)..."
              class="bg-transparent text-xs text-white/60 outline-none border-b border-transparent focus:border-[#E5383B] pb-1"
            />
          </div>

          <!-- Draggable Field List -->
          <div v-if="activePage" class="flex flex-col gap-3">
            <draggable
              v-model="activePage.fields"
              item-key="id"
              handle=".drag-handle"
              class="flex flex-col gap-3"
            >
              <template #item="{ element: field }">
                <div
                  @click="selectField(field.id)"
                  :class="[
                    'kaliber-card-solid p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                    builder.activeFieldId === field.id
                      ? 'border-[#E5383B] ring-2 ring-[#E5383B]/30 shadow-lg'
                      : 'border-white/10 hover:border-white/20',
                    field.archived && 'opacity-40 border-dashed',
                  ]"
                >
                  <div class="flex items-center gap-3 overflow-hidden flex-1">
                    <!-- Drag handle -->
                    <span class="drag-handle cursor-grab active:cursor-grabbing text-white/40 hover:text-white text-base select-none">
                      ⋮⋮
                    </span>

                    <div class="flex flex-col overflow-hidden">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-pt-sans-bold text-white truncate">
                          {{ field.label || 'Tanpa Label' }}
                        </span>
                        <span v-if="field.required" class="text-[#E5383B] text-xs font-bold">*</span>
                        <span v-if="field.archived" class="text-[10px] font-hack text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/40">
                          Diarsipkan
                        </span>
                      </div>
                      <div class="flex items-center gap-2 text-[11px] font-hack text-white/50 mt-0.5">
                        <span class="text-[#E5383B]">{{ field.type }}</span>
                        <span>&bull;</span>
                        <span v-if="field.visibleIf" class="text-amber-300">Bercabang (visibleIf)</span>
                        <span v-else>Selalu Tampil</span>
                      </div>
                    </div>
                  </div>

                  <!-- Field Action Buttons -->
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      @click.stop="builder.duplicateField(activePage.id, field.id)"
                      class="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/10 text-xs"
                      title="Duplikat"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      @click.stop="builder.deleteField(activePage.id, field.id)"
                      class="p-1.5 text-[#ff6b6d]/60 hover:text-[#ff6b6d] rounded hover:bg-white/10 text-xs"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </template>
            </draggable>

            <!-- Add Field Button & Menu -->
            <div class="relative mt-2">
              <KaliberButton
                variant="secondary"
                class="w-full border-dashed"
                @click="showAddFieldMenu = !showAddFieldMenu"
              >
                + {{ UI_MESSAGES.builder.addField }}
              </KaliberButton>

              <!-- Add Field Dropdown Palette -->
              <div
                v-if="showAddFieldMenu"
                class="absolute left-0 right-0 top-full mt-2 z-20 bg-[#1d2226] border border-white/20 rounded-xl p-4 shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                <button
                  v-for="cat in fieldTypeCategories"
                  :key="cat.type"
                  type="button"
                  @click="handleAddField(cat.type)"
                  class="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 hover:bg-[#C83338] text-white text-xs font-hack transition-colors text-left"
                >
                  <span class="text-base">{{ cat.icon }}</span>
                  <span class="truncate">{{ cat.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Field Property Inspector (5 cols) -->
        <div class="lg:col-span-5">
          <div class="sticky top-[140px] kaliber-card-solid p-6 rounded-xl border border-white/15 shadow-xl">
            <h3 class="font-pt-sans-bold text-base text-white border-b border-white/10 pb-3 mb-4">
              Pengaturan Kolom Terpilih
            </h3>

            <div v-if="activeField">
              <FieldEditor :field="activeField" :pages="builder.schema.pages" />
            </div>

            <div v-else class="p-8 text-center text-white/40 text-xs font-hack">
              Klik salah satu kolom di sebelah kiri untuk melihat dan mengubah pengaturannya.
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: Navigation Logic Editor -->
      <div v-else-if="activeTab === 'logic'" class="max-w-3xl mx-auto">
        <div v-if="activePage">
          <LogicEditor :page="activePage" :schema="builder.schema" />
        </div>
      </div>

      <!-- TAB 3: Settings Editor -->
      <div v-else-if="activeTab === 'settings'" class="max-w-3xl mx-auto">
        <div v-if="builder.currentForm">
          <SettingsEditor :form="builder.currentForm" :pages="builder.schema.pages" />
        </div>
      </div>

      <!-- TAB 4: Preview (Same Renderer as Public!) -->
      <div v-else-if="activeTab === 'preview'" class="py-4">
        <FormRenderer
          :schema="builder.schema"
          :title="builder.currentForm?.title || 'Pratinjau Formulir'"
          :description="builder.currentForm?.description || ''"
          :is-testing-mode="true"
        />
      </div>
    </main>

    <KaliberFooter />
  </div>
</template>
