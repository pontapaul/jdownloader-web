<script lang="ts">
/** The package whose destination is being changed. */
export interface MoveTarget {
  uuid: number
  name: string
  saveTo: string
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDownloadsStore } from '@/stores/downloads'
import {
  useDestination,
  describeSaveTo,
  destinationFolder,
} from '@/composables/useDestination'
import DestinationFields from '@/components/ui/DestinationFields.vue'

const props = defineProps<{
  open: boolean
  pkg: MoveTarget | null
}>()
const emit = defineEmits<{
  close: []
}>()

const store = useDownloadsStore()
const picker = useDestination()
const loading = ref(false)
const errorMessage = ref('')

const currentLabel = computed(() =>
  props.pkg ? (describeSaveTo(props.pkg.saveTo) ?? props.pkg.saveTo) : '',
)
/** Exact new folder for JD2, `null` while the picker is incomplete. */
const folder = computed(() =>
  picker.destination.value && props.pkg
    ? destinationFolder(picker.destination.value, props.pkg.name)
    : null,
)
const unchanged = computed(() => folder.value !== null && folder.value === props.pkg?.saveTo)
const canSubmit = computed(() => !loading.value && folder.value !== null && !unchanged.value)

watch(
  () => props.open,
  open => {
    if (!open || !props.pkg) return
    errorMessage.value = ''
    loading.value = false
    picker.setFromSaveTo(props.pkg.saveTo)
    picker.loadLibrary()
  },
)

function close() {
  if (!loading.value) emit('close')
}

async function submit() {
  if (!canSubmit.value || !props.pkg || !folder.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    await store.moveToFolder(props.pkg.uuid, folder.value)
    emit('close')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Errore durante lo spostamento'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && pkg"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      @click.self="close"
      @keydown.escape="close"
    >
      <div
        class="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:mx-4 text-sm max-h-[90vh] flex flex-col overflow-hidden"
        :aria-busy="loading"
      >
        <div class="px-4 py-2 border-b border-gray-300 bg-gray-100 font-semibold text-gray-800 shrink-0">
          Cambia destinazione
        </div>

        <fieldset :disabled="loading" class="p-4 space-y-3 overflow-y-auto min-w-0">
          <p class="text-xs text-gray-700 break-words">
            <span class="font-medium">{{ pkg.name }}</span>
            <br />
            <span class="text-gray-500">Ora in</span> {{ currentLabel }}
          </p>

          <DestinationFields :picker="picker" :name-placeholder="pkg.name" />

          <p v-if="picker.destination.value" class="text-xs text-gray-500">
            <template v-if="unchanged">È già la destinazione attuale.</template>
            <template v-else>
              I file già scaricati vengono spostati subito in
              <span class="font-medium text-gray-700">{{ picker.destination.value.label }}</span>;
              i download in corso si fermano un attimo e riprendono lì.
            </template>
          </p>

          <p v-if="errorMessage" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {{ errorMessage }}
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
            {{ loading ? 'Spostamento…' : 'Sposta' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
