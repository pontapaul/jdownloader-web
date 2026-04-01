<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useDownloadsStore } from './stores/downloads'
import AppLayout from './components/layout/AppLayout.vue'
import ToastNotification from './components/ui/ToastNotification.vue'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()

onMounted(async () => {
  await appStore.checkConnection()
  downloadsStore.startPolling()
})
</script>

<template>
  <AppLayout />
  <ToastNotification />
</template>
