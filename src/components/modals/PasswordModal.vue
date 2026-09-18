<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  /** Label of the cancel button (e.g. "Annulla" or "Rinuncia"). */
  cancelText?: string
  /** Error to show under the field (e.g. the previous attempt failed). */
  error?: string | null
}>()
const emit = defineEmits<{
  submit: [password: string]
  cancel: []
}>()

const password = ref('')
const loading = ref(false)

watch(
  () => props.open,
  open => {
    password.value = ''
    loading.value = false
    if (open) setTimeout(() => document.getElementById('archive-password')?.focus())
  },
  { immediate: true },
)

// A failed attempt re-enables the form
watch(
  () => props.error,
  () => {
    loading.value = false
  },
)

function submit() {
  const value = password.value.trim()
  if (!value || loading.value) return
  loading.value = true
  emit('submit', value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      @keydown.escape="emit('cancel')"
    >
      <div class="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-sm sm:mx-4 text-sm flex flex-col">
        <div class="px-4 py-2 border-b border-gray-300 bg-gray-100 rounded-t font-semibold text-gray-800">
          {{ title }}
        </div>
        <div class="p-4 space-y-3">
          <p class="text-xs text-gray-700 break-words">{{ message }}</p>
          <input
            id="archive-password"
            v-model="password"
            type="text"
            autocomplete="off"
            spellcheck="false"
            class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Password"
            @keydown.enter="submit"
          />
          <p v-if="error" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {{ error }}
          </p>
          <p class="text-xs text-gray-500">La password viene aggiunta alla lista password di JD2.</p>
        </div>
        <div class="flex justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b">
          <button class="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100" @click="emit('cancel')">
            {{ cancelText ?? 'Annulla' }}
          </button>
          <button
            class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading || !password.trim()"
            @click="submit"
          >
            {{ loading ? 'Estrazione...' : 'Estrai' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
