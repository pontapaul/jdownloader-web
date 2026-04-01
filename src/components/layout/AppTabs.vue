<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="flex bg-gray-100 border-b border-gray-400 shrink-0">
    <button
      class="px-4 py-1.5 text-sm border-r border-gray-400 transition-colors"
      :class="route.name === 'downloads'
        ? 'bg-white text-gray-900 font-medium border-b-2 border-b-blue-500'
        : 'text-gray-600 hover:bg-gray-200'"
      @click="router.push('/downloads')"
    >
      Download
    </button>
    <button
      class="px-4 py-1.5 text-sm border-r border-gray-400 transition-colors"
      :class="route.name === 'linkgrabber'
        ? 'bg-white text-gray-900 font-medium border-b-2 border-b-blue-500'
        : 'text-gray-600 hover:bg-gray-200'"
      @click="router.push('/linkgrabber')"
    >
      Cattura collegamenti
    </button>
    <div class="flex-1 border-b border-gray-300"></div>
  </div>
</template>
