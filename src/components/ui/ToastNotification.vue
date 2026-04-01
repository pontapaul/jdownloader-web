<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in appStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2 bg-gray-800 text-white text-xs rounded shadow-lg px-3 py-2 min-w-[200px] max-w-[320px]"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-green-400">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span class="flex-1 truncate">{{ toast.message }}</span>
          <button
            class="shrink-0 hover:text-gray-300"
            @click="appStore.dismissToast(toast.id)"
          >
            <svg viewBox="0 0 24 24" class="w-3 h-3">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
