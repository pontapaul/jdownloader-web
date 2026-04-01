<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <div class="p-4 max-w-md">
    <h1 class="text-lg font-semibold mb-4">Impostazioni</h1>

    <section>
      <h2 class="text-sm font-semibold text-gray-700 mb-2">Notifiche</h2>
      <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          v-model="appStore.showCompletionToasts"
          type="checkbox"
          class="w-4 h-4"
          @change="appStore.watchCompletionToasts()"
        />
        Mostra notifica al completamento del download
      </label>
    </section>
  </div>
</template>
