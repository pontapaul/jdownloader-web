<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppToolbar from './AppToolbar.vue'
import AppTabs from './AppTabs.vue'
import AppStatusBar from './AppStatusBar.vue'
import AddLinksModal from '@/components/modals/AddLinksModal.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

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
    <AddLinksModal v-model="appStore.showAddLinksModal" />
  </div>
</template>
