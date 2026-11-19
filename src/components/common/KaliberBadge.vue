<script setup lang="ts">
import type { FormStatus } from '@shared/types';
import { UI_MESSAGES } from '@shared/messages';

interface Props {
  status: FormStatus | string;
}

defineProps<Props>();
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-hack font-medium tracking-wide border',
      status === 'published' && 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
      status === 'draft' && 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      status === 'closed' && 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    ]"
  >
    <span
      :class="[
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'published' && 'bg-emerald-400 animate-pulse',
        status === 'draft' && 'bg-amber-300',
        status === 'closed' && 'bg-rose-400',
      ]"
    ></span>
    {{
      status === 'published'
        ? UI_MESSAGES.status.published
        : status === 'closed'
        ? UI_MESSAGES.status.closed
        : UI_MESSAGES.status.draft
    }}
  </span>
</template>
