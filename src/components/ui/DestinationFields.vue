<script setup lang="ts">
import { reactive, useId } from 'vue'
import type { DestinationKind, DestinationPicker } from '@/composables/useDestination'

const props = defineProps<{
  /** Picker state from `useDestination()`, owned by the dialog. */
  picker: DestinationPicker
  /** Shown in the empty package name field of "Altro" (e.g. the current package name). */
  namePlaceholder?: string
}>()

// Refs inside a reactive object are unwrapped: `fields.kind` reads and writes the ref
const fields = reactive(props.picker)

const kinds: { value: DestinationKind; label: string }[] = [
  { value: 'movies', label: 'Film' },
  { value: 'shows', label: 'Serie TV' },
  { value: 'downloads', label: 'Altro' },
]

// The datalists are global: one id per dialog
const listId = useId()

const inputClass =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50'
</script>

<template>
  <div>
    <label class="block text-xs font-medium text-gray-700 mb-1">Destinazione</label>
    <div class="flex rounded border border-gray-300 overflow-hidden">
      <button
        v-for="k in kinds"
        :key="k.value"
        type="button"
        class="flex-1 px-2 py-1 text-xs border-r last:border-r-0 border-gray-300"
        :class="fields.kind === k.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
        @click="fields.kind = k.value"
      >
        {{ k.label }}
      </button>
    </div>
  </div>

  <div v-if="fields.kind === 'movies'">
    <label class="block text-xs font-medium text-gray-700 mb-1">Titolo del film</label>
    <input
      v-model="fields.title"
      type="text"
      :list="`${listId}-movies`"
      :class="inputClass"
      placeholder="Es. Dune - Parte due (2024)"
    />
    <datalist :id="`${listId}-movies`">
      <option v-for="m in fields.movies" :key="m" :value="m" />
    </datalist>
  </div>

  <div v-else-if="fields.kind === 'shows'" class="flex gap-2">
    <div class="flex-1 min-w-0">
      <label class="block text-xs font-medium text-gray-700 mb-1">Serie</label>
      <input
        v-model="fields.show"
        type="text"
        :list="`${listId}-shows`"
        :class="inputClass"
        placeholder="Scegli o scrivi un nome nuovo"
      />
      <datalist :id="`${listId}-shows`">
        <option v-for="s in fields.shows" :key="s" :value="s" />
      </datalist>
    </div>
    <div class="w-20">
      <label class="block text-xs font-medium text-gray-700 mb-1">Stagione</label>
      <input v-model.number="fields.season" type="number" min="0" :class="inputClass" />
    </div>
  </div>

  <div v-else>
    <label class="block text-xs font-medium text-gray-700 mb-1">Nome pacchetto (opzionale)</label>
    <input
      v-model="fields.packageName"
      type="text"
      :class="inputClass"
      :placeholder="namePlaceholder ?? 'Lascia vuoto per automatico'"
    />
  </div>
</template>
