<script setup lang="ts">
defineProps<{
  value: number // 0–100
  colorClass?: string
}>()
</script>

<template>
  <div class="w-full h-2 bg-gray-200 rounded-sm overflow-hidden">
    <div
      class="h-full transition-all duration-300"
      :class="colorClass ?? 'bg-blue-500'"
      :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
    ></div>
  </div>
</template>
