<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLinkGrabberStore } from '@/stores/linkgrabber'
import { useAppStore } from '@/stores/app'
import { useFormatters } from '@/composables/useFormatters'
import { usePolling } from '@/composables/usePolling'
import GrabberRow from '@/components/linkgrabber/GrabberRow.vue'

const store = useLinkGrabberStore()
const appStore = useAppStore()
const { formatSize } = useFormatters()

usePolling(() => store.fetchLinks(), 2000)

// Selection
const selectedIds = ref<Set<number>>(new Set())

const allSelected = computed(
  () => store.links.length > 0 && store.links.every(l => selectedIds.value.has(l.uuid)),
)

function toggleAll(checked: boolean) {
  if (checked) {
    selectedIds.value = new Set(store.links.map(l => l.uuid))
  } else {
    selectedIds.value.clear()
  }
}

function setSelected(uuid: number, value: boolean) {
  if (value) {
    selectedIds.value.add(uuid)
  } else {
    selectedIds.value.delete(uuid)
  }
}

// Computed totals
const totalSize = computed(() =>
  store.links.reduce((s, l) => s + Math.max(0, l.bytesTotal), 0),
)

const selectedSize = computed(() =>
  store.links
    .filter(l => selectedIds.value.has(l.uuid))
    .reduce((s, l) => s + Math.max(0, l.bytesTotal), 0),
)

const selectedCount = computed(() => selectedIds.value.size)

// Toolbar actions
async function confirmAll() {
  const ids = store.links.map(l => l.uuid)
  if (!ids.length) return
  await store.confirmLinks(ids)
  selectedIds.value.clear()
}

async function confirmSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  await store.confirmLinks(ids)
  selectedIds.value.clear()
}

async function removeSelected() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  await store.removeLinks(ids)
  selectedIds.value.clear()
}

// Context menu
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  uuid: number
}

const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, uuid: 0 })

function showContextMenu(event: MouseEvent, uuid: number) {
  if (!selectedIds.value.has(uuid)) {
    selectedIds.value.clear()
    selectedIds.value.add(uuid)
  }
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, uuid }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function openUrl(uuid: number) {
  const link = store.links.find(l => l.uuid === uuid)
  if (link?.url) window.open(link.url, '_blank', 'noopener,noreferrer')
}

async function contextAction(action: string) {
  const { uuid } = contextMenu.value
  hideContextMenu()
  if (action === 'confirm') {
    const ids = selectedIds.value.size > 1 ? [...selectedIds.value] : [uuid]
    await store.confirmLinks(ids)
    selectedIds.value.clear()
  } else if (action === 'remove') {
    const ids = selectedIds.value.size > 1 ? [...selectedIds.value] : [uuid]
    await store.removeLinks(ids)
    selectedIds.value.clear()
  } else if (action === 'openurl') {
    openUrl(uuid)
  }
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden" @click="hideContextMenu">

    <!-- Grabber toolbar -->
    <div class="flex items-center gap-0.5 px-1 py-1 bg-gray-100 border-b border-gray-300 select-none shrink-0">
      <button
        class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
        title="Conferma tutto"
        :disabled="store.links.length === 0"
        @click="confirmAll"
      >
        <!-- double checkmark / confirm all -->
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
        </svg>
      </button>
      <button
        class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
        title="Conferma selezionati"
        :disabled="selectedCount === 0"
        @click="confirmSelected"
      >
        <!-- single checkmark -->
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </button>
      <button
        class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700 disabled:opacity-40"
        title="Rimuovi selezionati"
        :disabled="selectedCount === 0"
        @click="removeSelected"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
        </svg>
      </button>

      <div class="w-px h-5 bg-gray-400 mx-1 shrink-0"></div>

      <button
        class="p-1 rounded hover:bg-gray-300 active:bg-gray-400 text-gray-700"
        title="Aggiungi link"
        @click.stop="appStore.showAddLinksModal = true"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>

      <div class="flex-1"></div>

      <!-- Size info -->
      <span class="text-xs text-gray-500 mr-1">
        <template v-if="selectedCount > 0">
          {{ selectedCount }} selezionati — {{ formatSize(selectedSize) }}
        </template>
        <template v-else-if="store.links.length > 0">
          {{ store.links.length }} link — {{ formatSize(totalSize) }}
        </template>
      </span>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full border-collapse text-xs">
        <thead class="sticky top-0 z-10">
          <tr class="bg-gray-200 border-b border-gray-400 text-gray-700 font-medium text-left">
            <th class="pl-2 pr-1 py-1 w-6">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="selectedCount > 0 && !allSelected"
                class="cursor-pointer"
                @change="toggleAll(($event.target as HTMLInputElement).checked)"
              />
            </th>
            <th class="px-1 py-1">Nome</th>
            <th class="px-1 py-1 text-right hidden sm:table-cell">Dimensione</th>
            <th class="px-1 py-1 hidden sm:table-cell">Hoster</th>
            <th class="px-1 py-1 hidden sm:table-cell">Stato</th>
          </tr>
        </thead>
        <tbody>
          <GrabberRow
            v-for="link in store.links"
            :key="link.uuid"
            :link="link"
            :selected="selectedIds.has(link.uuid)"
            @update:selected="setSelected(link.uuid, $event)"
            @contextmenu="showContextMenu($event, link.uuid)"
          />
          <tr v-if="store.links.length === 0">
            <td colspan="5" class="text-center py-8 text-gray-400">
              Nessun link in attesa
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[150px] text-xs"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="contextAction('confirm')"
      >
        Conferma
      </button>
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="contextAction('openurl')"
      >
        Apri URL
      </button>
      <div class="h-px bg-gray-200 my-1"></div>
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-red-600"
        @click="contextAction('remove')"
      >
        Rimuovi
      </button>
    </div>

  </div>
</template>
