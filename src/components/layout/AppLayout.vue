<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToolbar from './AppToolbar.vue'
import AppTabs from './AppTabs.vue'
import AppStatusBar from './AppStatusBar.vue'
</script>

<template>
  <div class="flex flex-col h-screen bg-white overflow-hidden">
    <AppToolbar />
    <AppTabs />
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>
    <AppStatusBar />
  </div>
</template>
