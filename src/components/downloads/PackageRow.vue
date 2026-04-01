<script setup lang="ts">
import { computed } from 'vue'
import type { DownloadPackage } from '@/stores/downloads'
import { useFormatters } from '@/composables/useFormatters'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  pkg: DownloadPackage
  expanded: boolean
  selected: boolean
}>()

defineEmits<{
  toggle: []
  select: [event: MouseEvent]
  contextmenu: [event: MouseEvent]
}>()

const { formatSpeed, formatSize, formatEta } = useFormatters()

const packageName = computed(() =>
  props.pkg.links.length > 0 ? props.pkg.links[0].name : `Pacchetto ${props.pkg.uuid}`,
)

const totalSize = computed(() =>
  props.pkg.links.reduce((s, l) => s + Math.max(0, l.bytesTotal), 0),
)
const totalLoaded = computed(() => props.pkg.links.reduce((s, l) => s + l.bytesLoaded, 0))
const totalSpeed = computed(() =>
  props.pkg.links.reduce((s, l) => s + (l.running ? l.speed : 0), 0),
)
const maxEta = computed(() => {
  const etas = props.pkg.links.filter(l => l.running && l.eta > 0).map(l => l.eta)
  return etas.length ? Math.max(...etas) : -1
})
const activeConnections = computed(() => props.pkg.links.filter(l => l.running).length)

const allFinished = computed(() => props.pkg.links.every(l => l.finished))
const anyRunning = computed(() => props.pkg.links.some(l => l.running))
const anyError = computed(() =>
  props.pkg.links.some(l => l.status?.toLowerCase().includes('error') || l.skipped),
)
const allPaused = computed(() => props.pkg.links.every(l => !l.enabled && !l.finished))

const progress = computed(() => {
  if (totalSize.value <= 0) return allFinished.value ? 100 : 0
  return Math.min(100, (totalLoaded.value / totalSize.value) * 100)
})

const statusText = computed(() => {
  if (anyError.value) return 'Errore'
  if (allFinished.value) return 'Completato'
  if (allPaused.value) return 'In pausa'
  if (anyRunning.value) return 'Scaricamento'
  return 'In attesa'
})

const statusClass = computed(() => {
  if (anyError.value) return 'text-red-500'
  if (allFinished.value) return 'text-blue-600'
  if (allPaused.value) return 'text-gray-400'
  if (anyRunning.value) return 'text-green-600'
  return 'text-gray-600'
})

const progressColorClass = computed(() => {
  if (anyError.value) return 'bg-red-400'
  if (allFinished.value) return 'bg-blue-500'
  if (allPaused.value) return 'bg-gray-400'
  if (anyRunning.value) return 'bg-green-500'
  return 'bg-gray-400'
})

const rowClass = computed(() => (props.selected ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'))
</script>

<template>
  <tr
    class="text-xs font-semibold cursor-default border-b border-gray-300 select-none"
    :class="rowClass"
    @click.exact="$emit('select', $event)"
    @click.ctrl.exact="$emit('select', $event)"
    @click.meta.exact="$emit('select', $event)"
    @click.shift.exact="$emit('select', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <td class="pr-1 py-1 truncate max-w-0 w-full">
      <div class="flex items-center gap-1">
        <button
          class="p-0.5 rounded hover:bg-gray-200 shrink-0"
          @click.stop="$emit('toggle')"
        >
          <svg
            viewBox="0 0 24 24"
            class="w-3 h-3 transition-transform"
            :class="expanded ? 'rotate-90' : ''"
          >
            <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </button>
        <span class="truncate" :class="statusClass" :title="packageName">{{ packageName }}</span>
        <span class="text-gray-400 font-normal shrink-0">({{ pkg.links.length }})</span>
      </div>
    </td>
    <td class="px-1 py-1 text-right whitespace-nowrap hidden sm:table-cell text-gray-600">
      {{ totalSize > 0 ? formatSize(totalSize) : '—' }}
    </td>
    <td class="px-1 py-1 hidden sm:table-cell text-gray-400">—</td>
    <td class="px-1 py-1 text-center hidden md:table-cell text-gray-600">
      {{ activeConnections > 0 ? activeConnections : '—' }}
    </td>
    <td class="px-1 py-1 whitespace-nowrap hidden sm:table-cell" :class="statusClass">
      {{ statusText }}
    </td>
    <td class="px-1 py-1 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ totalSpeed > 0 ? formatSpeed(totalSpeed) : '—' }}
    </td>
    <td class="px-1 py-1 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ maxEta > 0 ? formatEta(maxEta) : '—' }}
    </td>
    <td class="px-1 py-1 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ totalLoaded > 0 ? formatSize(totalLoaded) : '—' }}
    </td>
    <td class="px-1 py-1 min-w-[80px]">
      <ProgressBar :value="progress" :color-class="progressColorClass" />
    </td>
    <td class="px-1 py-1 hidden lg:table-cell text-gray-400">—</td>
  </tr>
</template>
