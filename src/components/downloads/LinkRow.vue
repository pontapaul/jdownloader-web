<script setup lang="ts">
import { computed } from 'vue'
import type { DownloadLink } from '@/api/downloads'
import { useFormatters } from '@/composables/useFormatters'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  link: DownloadLink
  selected: boolean
}>()

defineEmits<{
  select: [event: MouseEvent]
  contextmenu: [event: MouseEvent]
}>()

const { formatSpeed, formatSize, formatEta } = useFormatters()

const isError = computed(
  () => props.link.status?.toLowerCase().includes('error') || props.link.skipped,
)

const rowClass = computed(() => {
  if (props.selected) return 'bg-blue-100'
  if (isError.value) return 'hover:bg-red-50'
  if (props.link.finished) return 'hover:bg-blue-50'
  if (!props.link.enabled) return 'hover:bg-gray-50'
  if (props.link.running) return 'hover:bg-green-50'
  return 'hover:bg-gray-50'
})

const statusClass = computed(() => {
  if (isError.value) return 'text-red-500'
  if (props.link.finished) return 'text-blue-600'
  if (!props.link.enabled) return 'text-gray-400'
  if (props.link.running) return 'text-green-600'
  return 'text-gray-600'
})

const progressColorClass = computed(() => {
  if (isError.value) return 'bg-red-400'
  if (props.link.finished) return 'bg-blue-500'
  if (!props.link.enabled) return 'bg-gray-400'
  if (props.link.running) return 'bg-green-500'
  return 'bg-gray-400'
})

const progress = computed(() => {
  if (props.link.bytesTotal <= 0) return props.link.finished ? 100 : 0
  return Math.min(100, (props.link.bytesLoaded / props.link.bytesTotal) * 100)
})
</script>

<template>
  <tr
    class="text-xs cursor-default border-b border-gray-100 select-none"
    :class="rowClass"
    @click.exact="$emit('select', $event)"
    @click.ctrl.exact="$emit('select', $event)"
    @click.meta.exact="$emit('select', $event)"
    @click.shift.exact="$emit('select', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <td class="pl-6 pr-1 py-0.5 truncate max-w-0 w-full" :title="link.name">
      <span :class="statusClass">{{ link.name }}</span>
    </td>
    <td class="px-1 py-0.5 text-right whitespace-nowrap hidden sm:table-cell text-gray-600">
      {{ link.bytesTotal > 0 ? formatSize(link.bytesTotal) : '—' }}
    </td>
    <td class="px-1 py-0.5 truncate max-w-[100px] hidden sm:table-cell text-gray-600">
      {{ link.host || '—' }}
    </td>
    <td class="px-1 py-0.5 text-center hidden md:table-cell text-gray-600">
      {{ link.running ? '1' : '0' }}
    </td>
    <td class="px-1 py-0.5 whitespace-nowrap hidden sm:table-cell" :class="statusClass">
      {{ link.status || '—' }}
    </td>
    <td class="px-1 py-0.5 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ link.running && link.speed > 0 ? formatSpeed(link.speed) : '—' }}
    </td>
    <td class="px-1 py-0.5 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ link.running ? formatEta(link.eta) : '—' }}
    </td>
    <td class="px-1 py-0.5 text-right whitespace-nowrap hidden md:table-cell text-gray-600 font-mono">
      {{ link.bytesLoaded > 0 ? formatSize(link.bytesLoaded) : '—' }}
    </td>
    <td class="px-1 py-0.5 min-w-[80px]">
      <ProgressBar :value="progress" :color-class="progressColorClass" />
    </td>
    <td class="px-1 py-0.5 truncate max-w-[80px] hidden lg:table-cell text-gray-500">
      {{ link.comment || '' }}
    </td>
  </tr>
</template>
