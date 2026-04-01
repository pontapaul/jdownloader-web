<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToolbar from './AppToolbar.vue'
import AppTabs from './AppTabs.vue'
import AppStatusBar from './AppStatusBar.vue'
import AddLinksModal from '@/components/modals/AddLinksModal.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
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
