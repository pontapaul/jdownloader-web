<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLinkGrabberStore } from '@/stores/linkgrabber'
import { useAppStore } from '@/stores/app'
import { CONTAINER_EXTENSIONS, containerDataUrl } from '@/api/linkgrabber'
import { useDestination, type DestinationKind } from '@/composables/useDestination'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useLinkGrabberStore()
const appStore = useAppStore()
const { kind, title, show, season, packageName, movies, shows, loadLibrary, destination, reset } =
  useDestination()
const urls = ref('')
const password = ref('')
/** Container files (DLC) to add, read as data URLs. */
const containers = ref<{ name: string; dataUrl: string }[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
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

async function addFiles(files: File[]) {
  errorMessage.value = ''
  for (const file of files) {
    if (!CONTAINER_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      errorMessage.value = `${file.name}: si possono caricare solo file .dlc`
      continue
    }
    if (containers.value.some(c => c.name === file.name)) continue
    containers.value.push({ name: file.name, dataUrl: await containerDataUrl(file) })
    // The file name is usually the release name: a good start for the movie title
    if (kind.value === 'movies' && !title.value) title.value = file.name.replace(/\.[^.]+$/, '')
  }
}

// Files dropped on the window (AppLayout) land here
watch(
  () => appStore.droppedFiles,
  files => {
    if (!files.length) return
    appStore.droppedFiles = []
    addFiles(files)
  },
  { immediate: true },
)

function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  input.value = ''
}

function close() {
  urls.value = ''
  password.value = ''
  containers.value = []
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
  if ((!lines.length && !containers.value.length) || !target) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const job = await store.addLinks(lines, {
      packageName: target.packageName,
      destinationFolder: target.destinationFolder,
      extractPassword: password.value.trim() || undefined,
      containers: containers.value.map(c => c.dataUrl),
    })
    if (!job) {
      successMessage.value = 'Link inviati: JD2 li sta ancora analizzando'
      setTimeout(close, 2000)
      return
    }
    const skipped = [
      job.unhandled && `${job.unhandled} non riconosciuti (nessun plugin di JD2 li gestisce)`,
      job.filtered && `${job.filtered} filtrati`,
      job.broken && `${job.broken} non analizzabili`,
    ].filter(Boolean)
    if (job.crawled === 0) {
      errorMessage.value = `Nessun link aggiunto: ${skipped.join(', ') || 'JD2 non ha trovato link (file DLC non valido?)'}`
      return
    }
    successMessage.value = `${job.crawled} link nel grabber` + (skipped.length ? ` · ${skipped.join(', ')}` : '')
    if (!skipped.length) setTimeout(close, 1200)
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
            <label class="block text-xs font-medium text-gray-700 mb-1">URL (uno per riga{{ containers.length ? ', opzionale' : '' }})</label>
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
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-gray-700">File DLC</span>
              <button
                type="button"
                class="px-2 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-100"
                @click="fileInput?.click()"
              >
                Scegli file…
              </button>
              <input
                ref="fileInput"
                type="file"
                :accept="CONTAINER_EXTENSIONS.join(',')"
                multiple
                class="hidden"
                @change="onFilesPicked"
              />
            </div>
            <ul v-if="containers.length" class="space-y-1">
              <li
                v-for="(c, i) in containers"
                :key="c.name"
                class="flex items-center gap-2 px-2 py-1 rounded bg-gray-100 text-xs"
              >
                <span class="flex-1 truncate font-mono" :title="c.name">{{ c.name }}</span>
                <button class="text-gray-500 hover:text-red-600" title="Togli" @click="containers.splice(i, 1)">✕</button>
              </li>
            </ul>
            <p v-else class="text-xs text-gray-400">Oppure trascina i file .dlc in qualsiasi punto della finestra</p>
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

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Password archivio (opzionale)</label>
            <input
              v-model="password"
              type="text"
              autocomplete="off"
              spellcheck="false"
              class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Viene anche aggiunta alla lista password di JD2"
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
            :disabled="loading || (!urls.trim() && !containers.length) || !destination"
            @click="submit"
          >
            {{ loading ? 'Analisi dei link...' : 'Aggiungi' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
