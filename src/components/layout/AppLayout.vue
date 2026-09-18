<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppToolbar from './AppToolbar.vue'
import AppTabs from './AppTabs.vue'
import AppStatusBar from './AppStatusBar.vue'
import AddLinksModal from '@/components/modals/AddLinksModal.vue'
import PasswordModal from '@/components/modals/PasswordModal.vue'
import { useAppStore } from '@/stores/app'
import { useExtractionStore } from '@/stores/extraction'
import { usePolling } from '@/composables/usePolling'
import { CONTAINER_EXTENSIONS } from '@/api/linkgrabber'

const appStore = useAppStore()
const extractionStore = useExtractionStore()

// JD2 asks for an archive password (e.g. a retry with a wrong one): answer from here,
// otherwise its extraction queue waits for the desktop GUI dialog
usePolling(() => extractionStore.fetchPrompts(), 3000)
const prompt = computed(() => extractionStore.prompts[0] ?? null)
const route = useRoute()
const router = useRouter()

function onGlobalKeydown(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.ctrlKey && event.key === 'l') {
    event.preventDefault()
    appStore.showAddLinksModal = true
  }
}

// Drop DLC files anywhere in the window to add their links
const dragging = ref(false)
let dragDepth = 0

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

function onDragEnter(event: DragEvent) {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth++
  dragging.value = true
}

function onDragOver(event: DragEvent) {
  if (hasFiles(event)) event.preventDefault()
}

function onDragLeave(event: DragEvent) {
  if (!hasFiles(event)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

function onDrop(event: DragEvent) {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = 0
  dragging.value = false
  const files = Array.from(event.dataTransfer?.files ?? []).filter(f =>
    CONTAINER_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)),
  )
  if (files.length) appStore.addContainerFiles(files)
  else appStore.addToast('Si possono rilasciare solo file .dlc')
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-white overflow-hidden">
    <AppToolbar />
    <AppTabs />
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>
    <AppStatusBar />
    <!-- Mobile bottom tab bar (hidden on md+) -->
    <nav class="flex md:hidden shrink-0 bg-gray-100 border-t border-gray-400 select-none">
      <button
        class="flex-1 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors"
        :class="route.name === 'downloads' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:bg-gray-200'"
        @click="router.push('/downloads')"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Download
      </button>
      <button
        class="flex-1 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors"
        :class="route.name === 'linkgrabber' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:bg-gray-200'"
        @click="router.push('/linkgrabber')"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
        Cattura
      </button>
    </nav>
    <AddLinksModal v-model="appStore.showAddLinksModal" />
    <div
      v-if="dragging"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-blue-600/20 border-4 border-dashed border-blue-500 pointer-events-none"
    >
      <div class="bg-white rounded-lg shadow-lg px-6 py-4 text-sm font-medium text-blue-700">
        Rilascia i file .dlc per aggiungerne i link
      </div>
    </div>
    <PasswordModal
      :key="prompt?.id"
      :open="prompt !== null"
      title="Password archivio"
      :message="`JDownloader2 chiede la password per l'archivio «${prompt?.archiveName}»: le password provate non sono corrette.`"
      cancel-text="Rinuncia"
      @submit="password => prompt && extractionStore.answerPrompt(prompt.id, password)"
      @cancel="prompt && extractionStore.answerPrompt(prompt.id, null)"
    />
  </div>
</template>
