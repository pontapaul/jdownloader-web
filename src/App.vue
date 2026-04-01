<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from './stores/app'
import { useDownloadsStore } from './stores/downloads'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()

onMounted(async () => {
  await appStore.checkConnection()
  downloadsStore.startPolling()
})
</script>

<template>
  <RouterView />
</template>
