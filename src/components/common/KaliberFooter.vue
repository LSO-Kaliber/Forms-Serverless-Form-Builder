<script setup lang="ts">
import { UI_MESSAGES } from '@shared/messages';
</script>

<template>
  <footer class="w-full border-t border-white/10 py-6 px-4 bg-[#101316] text-center text-xs font-hack text-white/40 mt-auto">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <div>{{ UI_MESSAGES.app.footerCopyright }}</div>
      <div class="flex items-center gap-4 text-white/50">
        <span>Cloudflare Workers</span>
        <span>•</span>
        <span>D1 SQL</span>
        <span>•</span>
        <span>R2 Storage</span>
      </div>
    </div>
  </footer>
</template>
