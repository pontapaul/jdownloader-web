<script setup lang="ts">
import { ref } from 'vue'
import { useLinkGrabberStore } from '@/stores/linkgrabber'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useLinkGrabberStore()
const urls = ref('')
const packageName = ref('')
const loading = ref(false)

function close() {
  urls.value = ''
  packageName.value = ''
  emit('update:modelValue', false)
}

async function submit() {
  const lines = urls.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return
  loading.value = true
  try {
    await store.addLinks(lines, packageName.value.trim() || undefined)
    close()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="close"
    >
      <div class="bg-white rounded shadow-xl w-full max-w-md mx-4 text-sm">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-gray-100 rounded-t">
          <span class="font-semibold text-gray-800">Aggiungi link</span>
          <button class="p-1 rounded hover:bg-gray-200 text-gray-600" @click="close">
            <svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">URL (uno per riga)</label>
            <textarea
              v-model="urls"
              rows="6"
              class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              placeholder="https://example.com/file.zip&#10;https://example.com/file2.zip"
              autofocus
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nome pacchetto (opzionale)</label>
            <input
              v-model="packageName"
              type="text"
              class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Lascia vuoto per automatico"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b">
          <button
            class="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
            @click="close"
          >
            Annulla
          </button>
          <button
            class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading || !urls.trim()"
            @click="submit"
          >
            {{ loading ? 'Aggiunta...' : 'Aggiungi' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
