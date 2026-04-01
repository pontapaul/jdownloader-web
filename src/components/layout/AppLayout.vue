<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppToolbar from './AppToolbar.vue'
import AppTabs from './AppTabs.vue'
import AppStatusBar from './AppStatusBar.vue'
import AddLinksModal from '@/components/modals/AddLinksModal.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
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

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
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
  </div>
</template>
