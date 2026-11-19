<script setup lang="ts">
import { computed } from 'vue';
import type { FormPage, FormSchema, PageJumpRule } from '@shared/types';
import { detectJumpCycles } from '@shared/evaluator';
import { UI_MESSAGES } from '@shared/messages';

interface Props {
  page: FormPage;
  schema: FormSchema;
}

const props = defineProps<Props>();

// Target page options (other pages + SUBMIT)
const targetPageOptions = computed(() => {
  const list: { id: string; label: string }[] = [];
  props.schema.pages.forEach((p, idx) => {
    if (p.id !== props.page.id) {
      list.push({ id: p.id, label: `${p.title || `Halaman ${idx + 1}`} (${p.id})` });
    }
  });
  list.push({ id: 'SUBMIT', label: '--- Selesai / Kirim Formulir Langsung ---' });
  return list;
});

// All available fields in current page for conditions
const pageFields = computed(() => {
  return props.page.fields.filter((f) => f.type !== 'info');
});

// Jump rules on current page
if (!props.page.pageJumpRules) {
  props.page.pageJumpRules = [];
}

function addJumpRule() {
  if (targetPageOptions.value.length === 0) return;
  const newRule: PageJumpRule = {
    id: `jump_${crypto.randomUUID().slice(0, 8)}`,
    conditionGroup: {
      logicalOperator: 'AND',
      conditions: pageFields.value.length > 0 ? [{ fieldId: pageFields.value[0].id, operator: 'eq', value: '' }] : [],
    },
    targetPageId: targetPageOptions.value[0].id,
  };
  props.page.pageJumpRules!.push(newRule);
}

function removeJumpRule(index: number) {
  props.page.pageJumpRules!.splice(index, 1);
}

function addConditionToJump(rule: PageJumpRule) {
  if (pageFields.value.length > 0) {
    rule.conditionGroup.conditions.push({
      fieldId: pageFields.value[0].id,
      operator: 'eq',
      value: '',
    });
  }
}

function removeConditionFromJump(rule: PageJumpRule, cIdx: number) {
  rule.conditionGroup.conditions.splice(cIdx, 1);
}

const cycleWarning = computed(() => {
  const check = detectJumpCycles(props.schema);
  return check.hasCycle;
});
</script>

<template>
  <div class="flex flex-col gap-6 text-sm text-white">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <div>
        <h3 class="font-pt-sans-bold text-base text-white">
          Aturan Navigasi & Lompat Halaman
        </h3>
        <p class="text-xs text-white/50">
          Atur ke halaman mana responden akan diarahkan setelah menyelesaikan halaman "{{ page.title }}"
        </p>
      </div>

      <button
        type="button"
        @click="addJumpRule"
        class="text-xs font-hack text-white bg-[#C83338] hover:bg-[#a8262b] px-3 py-1.5 rounded transition-colors"
      >
        + Tambah Aturan Lompat
      </button>
    </div>

    <!-- Cycle Warning Banner -->
    <div
      v-if="cycleWarning"
      class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/40 text-[#ff6b6d] text-xs flex items-center gap-2"
    >
      <span class="text-base">⚠️</span>
      <span>
        <strong>Peringatan Siklus:</strong> {{ UI_MESSAGES.builder.cycleDetected }} Pastikan aturan tidak saling melompat berulang tanpa akhir.
      </span>
    </div>

    <!-- Empty state -->
    <div
      v-if="!page.pageJumpRules || page.pageJumpRules.length === 0"
      class="p-8 text-center border border-dashed border-white/15 rounded-xl text-white/40 text-xs font-hack"
    >
      Tidak ada aturan lompat kustom. Responden akan diarahkan ke halaman berikutnya secara berurutan.
    </div>

    <!-- Jump Rules List -->
    <div v-else class="flex flex-col gap-4">
      <div
        v-for="(rule, idx) in page.pageJumpRules"
        :key="rule.id"
        class="kaliber-card-solid p-4 rounded-xl border border-white/10 flex flex-col gap-3 relative"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-hack font-bold text-[#E5383B]">
            Aturan #{{ idx + 1 }}
          </span>
          <button
            type="button"
            @click="removeJumpRule(idx)"
            class="text-xs text-[#ff6b6d] hover:underline"
          >
            Hapus Aturan
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="text-white/70">Jika kondisi berikut terpenuhi:</span>
          <select
            v-model="rule.conditionGroup.logicalOperator"
            class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none"
          >
            <option value="AND">SEMUA (AND)</option>
            <option value="OR">SALAH SATU (OR)</option>
          </select>
        </div>

        <!-- Condition rows -->
        <div class="flex flex-col gap-2 pl-3 border-l-2 border-white/20">
          <div
            v-for="(cond, cIdx) in rule.conditionGroup.conditions"
            :key="cIdx"
            class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <select
              v-model="cond.fieldId"
              class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none flex-1"
            >
              <option v-for="f in pageFields" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>

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

            <input
              v-if="!['empty', 'notEmpty'].includes(cond.operator)"
              type="text"
              v-model="cond.value"
              placeholder="Nilai..."
              class="bg-[#101316] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none flex-1"
            />

            <button
              type="button"
              @click="removeConditionFromJump(rule, cIdx)"
              class="text-white/40 hover:text-[#ff6b6d] text-sm px-1"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            @click="addConditionToJump(rule)"
            class="text-[11px] font-hack text-[#E5383B] hover:underline self-start mt-1"
          >
            + Tambah Syarat Kondisi
          </button>
        </div>

        <!-- Target page selector -->
        <div class="flex items-center gap-3 pt-2 border-t border-white/10 text-xs">
          <span class="font-hack text-white/80 font-bold">Maka Lompat Ke:</span>
          <select
            v-model="rule.targetPageId"
            class="bg-[#101316] border border-white/30 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#E5383B] flex-1"
          >
            <option v-for="tgt in targetPageOptions" :key="tgt.id" :value="tgt.id">
              {{ tgt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
