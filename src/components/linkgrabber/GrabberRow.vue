<script setup lang="ts">
import { computed } from 'vue'
import type { GrabberLink } from '@/api/linkgrabber'
import { useFormatters } from '@/composables/useFormatters'

const props = defineProps<{
  link: GrabberLink
  selected: boolean
}>()

defineEmits<{
  'update:selected': [value: boolean]
  contextmenu: [event: MouseEvent]
}>()

const { formatSize } = useFormatters()

const availabilityClass = computed(() => {
  switch (props.link.availability) {
    case 'ONLINE': return 'text-green-600'
    case 'OFFLINE': return 'text-red-500'
    case 'TEMP_UNKNOWN': return 'text-yellow-600'
    default: return 'text-gray-400'
  }
})

const availabilityLabel = computed(() => {
  switch (props.link.availability) {
    case 'ONLINE': return 'Online'
    case 'OFFLINE': return 'Offline'
    case 'TEMP_UNKNOWN': return 'Sconosciuto'
    default: return '—'
  }
})

const rowClass = computed(() =>
  props.selected ? 'bg-blue-100' : 'hover:bg-gray-50'
)
</script>

<template>
  <tr
    class="text-xs cursor-default border-b border-gray-100 select-none"
    :class="rowClass"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <td class="pl-2 pr-1 py-1 w-6">
      <input
        type="checkbox"
        :checked="selected"
        class="cursor-pointer"
        @change="$emit('update:selected', ($event.target as HTMLInputElement).checked)"
        @click.stop
      />
    </td>
    <td class="px-1 py-1 truncate max-w-0 w-full" :title="link.name">
      {{ link.name }}
    </td>
    <td class="px-1 py-1 text-right whitespace-nowrap hidden sm:table-cell text-gray-600">
      {{ link.bytesTotal > 0 ? formatSize(link.bytesTotal) : '—' }}
    </td>
    <td class="px-1 py-1 truncate max-w-[100px] hidden sm:table-cell text-gray-600">
      {{ link.host || '—' }}
    </td>
    <td class="px-1 py-1 whitespace-nowrap hidden sm:table-cell" :class="availabilityClass">
      {{ availabilityLabel }}
    </td>
  </tr>
</template>
