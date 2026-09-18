<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLinkGrabberStore } from '@/stores/linkgrabber'
import { useAppStore } from '@/stores/app'
import { CONTAINER_EXTENSIONS, containerDataUrl, type CrawlerJob } from '@/api/linkgrabber'
import { useDestination, type DestinationKind } from '@/composables/useDestination'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useLinkGrabberStore()
const appStore = useAppStore()
const { kind, title, show, season, packageName, movies, shows, loadLibrary, destination, reset } =
  useDestination()

/** Where the links come from: pasted URLs or DLC files. Only the active tab is sent. */
type Source = 'links' | 'dlc'
const source = ref<Source>('links')
const sources: { value: Source; label: string }[] = [
  { value: 'links', label: 'Link' },
  { value: 'dlc', label: 'File DLC' },
]

const urls = ref('')
const password = ref('')
/** Container files (DLC) to add, read as data URLs. */
const containers = ref<{ name: string; dataUrl: string }[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
/** Crawler job state while JD2 analyzes the links. */
const progress = ref<CrawlerJob | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const kinds: { value: DestinationKind; label: string }[] = [
  { value: 'movies', label: 'Film' },
  { value: 'shows', label: 'Serie TV' },
  { value: 'downloads', label: 'Altro' },
]

const urlLines = computed(() =>
  urls.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean),
)

const canSubmit = computed(
  () =>
    !loading.value &&
    destination.value !== null &&
    (source.value === 'links' ? urlLines.value.length > 0 : containers.value.length > 0),
)

const progressText = computed(() => {
  const job = progress.value
  if (!job || job.crawled === 0) return source.value === 'dlc' ? 'Lettura del file DLC…' : 'Ricerca dei file…'
  const found = `${job.crawled} link trovati`
  return job.checking && !job.crawling ? `${found}, controllo disponibilità…` : `${found}…`
})

watch(
  () => props.modelValue,
  open => {
    if (open) loadLibrary()
  },
)

async function addFiles(files: File[]) {
  source.value = 'dlc'
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
    if (!files.length || loading.value) return
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
  // No way out while JD2 is analyzing: the result is on its way
  if (loading.value) return
  source.value = 'links'
  urls.value = ''
  password.value = ''
  containers.value = []
  reset()
  errorMessage.value = ''
  successMessage.value = ''
  emit('update:modelValue', false)
}

async function submit() {
  const target = destination.value
  if (!canSubmit.value || !target) return
  loading.value = true
  progress.value = null
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const job = await store.addLinks(
      source.value === 'links' ? urlLines.value : [],
      {
        packageName: target.packageName,
        destinationFolder: target.destinationFolder,
        extractPassword: password.value.trim() || undefined,
        containers: source.value === 'dlc' ? containers.value.map(c => c.dataUrl) : [],
      },
      job => {
        progress.value = job
      },
    )
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
      errorMessage.value = `Nessun link aggiunto: ${
        skipped.join(', ') || (source.value === 'dlc' ? 'il file DLC non contiene link validi' : 'JD2 non ha trovato file')
      }`
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

const inputClass =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      @click.self="close"
      @keydown.escape="close"
    >
      <div
        class="relative bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:mx-4 text-sm max-h-[90vh] flex flex-col overflow-hidden"
        :aria-busy="loading"
      >
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-gray-100 shrink-0">
          <span class="font-semibold text-gray-800">Aggiungi link</span>
          <button class="p-1 rounded hover:bg-gray-200 text-gray-600" :disabled="loading" @click="close">
            <svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <!-- Source tabs -->
        <div class="flex border-b border-gray-300 bg-gray-50 px-4 shrink-0" role="tablist">
          <button
            v-for="s in sources"
            :key="s.value"
            type="button"
            role="tab"
            :aria-selected="source === s.value"
            class="px-3 py-1.5 -mb-px text-xs border-b-2"
            :class="source === s.value
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-800'"
            :disabled="loading"
            @click="source = s.value"
          >
            {{ s.label }}
            <span v-if="s.value === 'dlc' && containers.length" class="ml-1 text-gray-500">({{ containers.length }})</span>
          </button>
        </div>

        <fieldset :disabled="loading" class="p-4 space-y-3 overflow-y-auto min-w-0">
          <div v-if="source === 'links'">
            <label class="block text-xs font-medium text-gray-700 mb-1">URL (uno per riga)</label>
            <textarea
              v-model="urls"
              rows="6"
              :class="[inputClass, 'font-mono resize-none']"
              placeholder="https://example.com/file.zip&#10;https://example.com/file2.zip"
              autofocus
            />
          </div>

          <div v-else>
            <button
              type="button"
              class="w-full flex flex-col items-center gap-1 px-3 py-5 rounded border-2 border-dashed border-gray-300 text-xs text-gray-600 hover:border-blue-400 hover:bg-blue-50"
              @click="fileInput?.click()"
            >
              <svg viewBox="0 0 24 24" class="w-6 h-6 text-gray-400"><path fill="currentColor" d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
              <span><span class="text-blue-600 font-medium">Scegli i file .dlc</span> o trascinali qui</span>
            </button>
            <input
              ref="fileInput"
              type="file"
              :accept="CONTAINER_EXTENSIONS.join(',')"
              multiple
              class="hidden"
              @change="onFilesPicked"
            />
            <ul v-if="containers.length" class="mt-2 space-y-1">
              <li
                v-for="(c, i) in containers"
                :key="c.name"
                class="flex items-center gap-2 px-2 py-1 rounded bg-gray-100 text-xs"
              >
                <span class="flex-1 truncate font-mono" :title="c.name">{{ c.name }}</span>
                <button class="text-gray-500 hover:text-red-600" title="Togli" @click="containers.splice(i, 1)">✕</button>
              </li>
            </ul>
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
              :class="inputClass"
              placeholder="Es. Dune - Parte due (2024)"
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
                :class="inputClass"
                placeholder="Scegli o scrivi un nome nuovo"
              />
              <datalist id="library-shows">
                <option v-for="s in shows" :key="s" :value="s" />
              </datalist>
            </div>
            <div class="w-20">
              <label class="block text-xs font-medium text-gray-700 mb-1">Stagione</label>
              <input v-model.number="season" type="number" min="0" :class="inputClass" />
            </div>
          </div>

          <div v-else>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nome pacchetto (opzionale)</label>
            <input
              v-model="packageName"
              type="text"
              :class="inputClass"
              placeholder="Lascia vuoto per automatico"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Password archivio (opzionale)</label>
            <input
              v-model="password"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :class="[inputClass, 'font-mono']"
              placeholder="Viene anche aggiunta alla lista password di JD2"
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
        </fieldset>

        <div class="flex justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            class="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            :disabled="loading"
            @click="close"
          >
            Annulla
          </button>
          <button
            class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="!canSubmit"
            @click="submit"
          >
            Aggiungi
          </button>
        </div>

        <!-- Analysis in progress: covers and blocks the whole dialog -->
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-500/40 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <div class="flex flex-col items-center gap-2 rounded-lg bg-white px-6 py-4 shadow-lg">
            <svg class="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            <span class="text-xs font-medium text-gray-800">JDownloader2 sta analizzando i link</span>
            <span class="text-xs text-gray-500">{{ progressText }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
