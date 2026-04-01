<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useDownloadsStore } from '@/stores/downloads'
import { useFormatters } from '@/composables/useFormatters'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()
const { formatSpeed, formatSize } = useFormatters()

const packageCount = computed(() => downloadsStore.packages.length)
const linkCount = computed(() => downloadsStore.links.length)
const activeConnections = computed(() => downloadsStore.links.filter(l => l.running).length)

const remainingBytes = computed(() =>
  downloadsStore.links
    .filter(l => !l.finished && l.bytesTotal > 0)
    .reduce((sum, l) => sum + Math.max(0, l.bytesTotal - l.bytesLoaded), 0)
)
</script>

<template>
  <div class="flex items-center gap-4 px-3 py-0.5 bg-gray-200 border-t border-gray-400 text-xs shrink-0 font-mono">
    <span title="Pacchetti">
      <span class="text-gray-500">Pacchetti:</span>
      <span class="ml-1 text-gray-800">{{ packageCount }}</span>
    </span>
    <span title="Link">
      <span class="text-gray-500">Link:</span>
      <span class="ml-1 text-gray-800">{{ linkCount }}</span>
    </span>
    <span title="Velocità totale">
      <span class="text-gray-500">Velocità:</span>
      <span class="ml-1 text-gray-800">{{ formatSpeed(appStore.globalSpeed) }}</span>
    </span>
    <span title="Dati rimanenti">
      <span class="text-gray-500">Rimanente:</span>
      <span class="ml-1 text-gray-800">{{ remainingBytes > 0 ? formatSize(remainingBytes) : '—' }}</span>
    </span>
    <span title="Connessioni attive">
      <span class="text-gray-500">Connessioni:</span>
      <span class="ml-1 text-gray-800">{{ activeConnections }}</span>
    </span>
    <div class="flex-1"></div>
    <span
      :class="appStore.connected ? 'text-green-700' : 'text-red-600'"
      class="font-sans text-xs"
    >
      {{ appStore.connected ? 'Connesso' : 'Non connesso' }}
    </span>
  </div>
</template>
