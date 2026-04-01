<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useDownloadsStore } from '@/stores/downloads'
import { useFormatters } from '@/composables/useFormatters'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()
const router = useRouter()
const { formatSpeed } = useFormatters()

// ── Speed limit popover ──────────────────────────────────────────────────────
const showSpeedPopover = ref(false)

/** Input value in KB/s; 0 = unlimited */
const speedInputKbps = ref(0)

function openSpeedPopover() {
  speedInputKbps.value = Math.round(appStore.speedLimit / 1024)
  showSpeedPopover.value = true
}

async function applySpeedLimit() {
  await appStore.applySpeedLimit(speedInputKbps.value * 1024)
  showSpeedPopover.value = false
}

function closePopoverOnEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') showSpeedPopover.value = false
}

onMounted(() => {
  appStore.fetchSpeedLimit()
  document.addEventListener('keydown', closePopoverOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', closePopoverOnEscape)
})
</script>

<template>
  <div class="flex items-center gap-0.5 px-1 py-1 bg-gray-200 border-b border-gray-400 select-none shrink-0 relative">
    <!-- Start all -->
    <button
      :class="[
        'p-1 rounded hover:bg-gray-300 active:bg-gray-400 disabled:opacity-40',
        downloadsStore.allPaused ? 'text-green-700 bg-green-100' : 'text-gray-700',
      ]"
      title="Avvia tutti"
      @click="downloadsStore.resumeAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
    </button>

    <!-- Pause all -->
    <button
      :class="[
        'p-1 rounded hover:bg-gray-300 active:bg-gray-400 disabled:opacity-40',
        downloadsStore.hasActiveDownloads ? 'text-yellow-700 bg-yellow-100' : 'text-gray-700',
      ]"
      title="Pausa tutti"
      @click="downloadsStore.pauseAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    </button>

    <!-- Stop all -->
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Ferma tutti"
      @click="downloadsStore.stopAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
    </button>

    <div class="w-px h-5 bg-gray-400 mx-1 shrink-0"></div>

    <!-- Clean finished -->
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Pulisci completati"
      @click="downloadsStore.cleanFinished()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5">
        <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
      </svg>
    </button>

    <!-- Add links -->
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Aggiungi link (Ctrl+L)"
      @click="appStore.showAddLinksModal = true"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>

    <div class="w-px h-5 bg-gray-400 mx-1 shrink-0"></div>

    <!-- Speed limit toggle button -->
    <button
      :class="[
        'p-1 rounded hover:bg-gray-300 active:bg-gray-400 disabled:opacity-40',
        appStore.speedLimit > 0 ? 'text-blue-700 bg-blue-100' : 'text-gray-700',
      ]"
      :title="appStore.speedLimit > 0 ? `Limite velocità: ${Math.round(appStore.speedLimit / 1024)} KB/s` : 'Limite velocità (disabilitato)'"
      @click="openSpeedPopover"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
      </svg>
    </button>

    <!-- Speed limit popover -->
    <div
      v-if="showSpeedPopover"
      class="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-300 rounded shadow-lg p-3 min-w-52"
      @click.stop
    >
      <div class="text-xs font-semibold text-gray-700 mb-2">Limite velocità download</div>
      <div class="flex items-center gap-2 mb-2">
        <input
          v-model.number="speedInputKbps"
          type="number"
          min="0"
          step="100"
          class="w-24 border border-gray-300 rounded px-2 py-1 text-xs"
          placeholder="0 = illimitato"
          @keydown.enter="applySpeedLimit"
        />
        <span class="text-xs text-gray-500">KB/s</span>
      </div>
      <input
        v-model.number="speedInputKbps"
        type="range"
        min="0"
        max="102400"
        step="512"
        class="w-full mb-2"
      />
      <div class="text-xs text-gray-400 mb-3">
        {{ speedInputKbps === 0 ? 'Illimitato' : `${speedInputKbps} KB/s` }}
      </div>
      <div class="flex gap-2">
        <button
          class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          @click="applySpeedLimit"
        >
          Applica
        </button>
        <button
          class="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          @click="showSpeedPopover = false"
        >
          Annulla
        </button>
      </div>
    </div>

    <div class="flex-1"></div>

    <!-- Current download speed -->
    <span
      v-if="appStore.globalSpeed > 0"
      class="text-xs font-mono text-gray-600 mr-2"
      title="Velocità attuale"
    >
      {{ formatSpeed(appStore.globalSpeed) }}
    </span>

    <!-- Connection status indicator -->
    <span
      :class="appStore.connected ? 'text-green-600' : 'text-red-500'"
      :title="appStore.connected ? 'Connesso a JDownloader' : 'Non connesso'"
      class="mr-1"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>
    </span>

    <!-- Settings -->
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700"
      title="Impostazioni"
      @click="router.push('/settings')"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5">
        <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7 7 0 00-1.62-.94l-.36-2.54A.484.484 0 0014 2h-4a.484.484 0 00-.48.41l-.36 2.54a7.4 7.4 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.47a.48.48 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.48.41h4c.21 0 .43-.17.47-.41l.36-2.54a7.4 7.4 0 001.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/>
      </svg>
    </button>
  </div>
</template>
