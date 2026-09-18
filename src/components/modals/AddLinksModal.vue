<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLinkGrabberStore } from '@/stores/linkgrabber'
import { useDestination, type DestinationKind } from '@/composables/useDestination'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useLinkGrabberStore()
const { kind, title, show, season, packageName, movies, shows, loadLibrary, destination, reset } =
  useDestination()
const urls = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const kinds: { value: DestinationKind; label: string }[] = [
  { value: 'movies', label: 'Film' },
  { value: 'shows', label: 'Serie TV' },
  { value: 'downloads', label: 'Altro' },
]

watch(
  () => props.modelValue,
  open => {
    if (open) loadLibrary()
  },
)

function close() {
  urls.value = ''
  reset()
  errorMessage.value = ''
  successMessage.value = ''
  emit('update:modelValue', false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

async function submit() {
  const lines = urls.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const target = destination.value
  if (!lines.length || !target) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await store.addLinks(lines, target.packageName, target.destinationFolder)
    successMessage.value = `${lines.length} link aggiunti al grabber`
    setTimeout(close, 1200)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Errore durante l\'aggiunta dei link'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      @click.self="close"
      @keydown="onKeydown"
    >
      <div class="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:mx-4 text-sm max-h-[90vh] overflow-y-auto flex flex-col">
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
              @keydown.escape="close"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Destinazione</label>
            <div class="flex rounded border border-gray-300 overflow-hidden">
              <button
                v-for="k in kinds"
                :key="k.value"
                type="button"
                class="flex-1 px-2 py-1 text-xs border-r last:border-r-0 border-gray-300"
                :class="kind === k.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
                @click="kind = k.value"
              >
                {{ k.label }}
              </button>
            </div>
          </div>

          <div v-if="kind === 'movies'">
            <label class="block text-xs font-medium text-gray-700 mb-1">Titolo del film</label>
            <input
              v-model="title"
              type="text"
              list="library-movies"
              class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Es. Dune - Parte due (2024)"
              @keydown.escape="close"
            />
            <datalist id="library-movies">
              <option v-for="m in movies" :key="m" :value="m" />
            </datalist>
          </div>

          <div v-else-if="kind === 'shows'" class="flex gap-2">
            <div class="flex-1 min-w-0">
              <label class="block text-xs font-medium text-gray-700 mb-1">Serie</label>
              <input
                v-model="show"
                type="text"
                list="library-shows"
                class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Scegli o scrivi un nome nuovo"
                @keydown.escape="close"
              />
              <datalist id="library-shows">
                <option v-for="s in shows" :key="s" :value="s" />
              </datalist>
            </div>
            <div class="w-20">
              <label class="block text-xs font-medium text-gray-700 mb-1">Stagione</label>
              <input
                v-model.number="season"
                type="number"
                min="0"
                class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                @keydown.escape="close"
              />
            </div>
          </div>

          <div v-else>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nome pacchetto (opzionale)</label>
            <input
              v-model="packageName"
              type="text"
              class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Lascia vuoto per automatico"
              @keydown.escape="close"
            />
          </div>

          <p v-if="destination" class="text-xs text-gray-500">
            Scaricato ed estratto sull'SSD, poi spostato in
            <span class="font-medium text-gray-700">{{ destination.label }}</span>
          </p>

          <p v-if="errorMessage" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {{ errorMessage }}
          </p>
          <p v-if="successMessage" class="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
            {{ successMessage }}
          </p>
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
            :disabled="loading || !urls.trim() || !destination"
            @click="submit"
          >
            {{ loading ? 'Aggiunta...' : 'Aggiungi' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
