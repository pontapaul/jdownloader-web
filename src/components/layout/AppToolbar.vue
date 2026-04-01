<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useDownloadsStore } from '@/stores/downloads'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()
const router = useRouter()
</script>

<template>
  <div class="flex items-center gap-0.5 px-1 py-1 bg-gray-200 border-b border-gray-400 select-none shrink-0">
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Avvia tutti"
      @click="downloadsStore.resumeAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
    </button>
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Pausa tutti"
      @click="downloadsStore.pauseAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    </button>
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Ferma tutti"
      @click="downloadsStore.pauseAll()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
    </button>

    <div class="w-px h-5 bg-gray-400 mx-1 shrink-0"></div>

    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Pulisci completati"
      @click="downloadsStore.cleanFinished()"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5">
        <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
      </svg>
    </button>
    <button
      class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
      title="Aggiungi link (Ctrl+L)"
      @click="appStore.showAddLinksModal = true"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>

    <div class="flex-1"></div>

    <span
      :class="appStore.connected ? 'text-green-600' : 'text-red-500'"
      :title="appStore.connected ? 'Connesso a JDownloader' : 'Non connesso'"
      class="mr-1"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>
    </span>

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
