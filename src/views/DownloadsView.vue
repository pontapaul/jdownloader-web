<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDownloadsStore } from '@/stores/downloads'
import PackageRow from '@/components/downloads/PackageRow.vue'
import LinkRow from '@/components/downloads/LinkRow.vue'

const store = useDownloadsStore()

// Expand/collapse per package
const expandedPackages = ref<Set<number>>(new Set())

function togglePackage(uuid: number) {
  if (expandedPackages.value.has(uuid)) {
    expandedPackages.value.delete(uuid)
  } else {
    expandedPackages.value.add(uuid)
  }
}

// Selection (by link UUID)
const selectedLinks = ref<Set<number>>(new Set())
const lastSelectedLink = ref<number | null>(null)

// Flattened ordered list of visible link UUIDs for shift-click range
const visibleLinkIds = computed<number[]>(() => {
  const ids: number[] = []
  for (const pkg of store.packages) {
    if (expandedPackages.value.has(pkg.uuid)) {
      for (const link of pkg.links) ids.push(link.uuid)
    }
  }
  return ids
})

function selectLink(uuid: number, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    if (selectedLinks.value.has(uuid)) {
      selectedLinks.value.delete(uuid)
    } else {
      selectedLinks.value.add(uuid)
    }
  } else if (event.shiftKey && lastSelectedLink.value !== null) {
    const ids = visibleLinkIds.value
    const from = ids.indexOf(lastSelectedLink.value)
    const to = ids.indexOf(uuid)
    if (from !== -1 && to !== -1) {
      const [start, end] = from < to ? [from, to] : [to, from]
      for (let i = start; i <= end; i++) selectedLinks.value.add(ids[i])
    }
  } else {
    selectedLinks.value.clear()
    selectedLinks.value.add(uuid)
  }
  lastSelectedLink.value = uuid
}

function selectPackage(pkgUuid: number, event: MouseEvent) {
  const pkg = store.packages.find(p => p.uuid === pkgUuid)
  if (!pkg) return
  const linkIds = pkg.links.map(l => l.uuid)
  if (event.ctrlKey || event.metaKey) {
    const allSelected = linkIds.every(id => selectedLinks.value.has(id))
    if (allSelected) {
      for (const id of linkIds) selectedLinks.value.delete(id)
    } else {
      for (const id of linkIds) selectedLinks.value.add(id)
    }
  } else {
    selectedLinks.value.clear()
    for (const id of linkIds) selectedLinks.value.add(id)
  }
}

// Context menu
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  type: 'package' | 'link'
  uuid: number
}

const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  type: 'link',
  uuid: 0,
})

function showContextMenu(event: MouseEvent, type: 'package' | 'link', uuid: number) {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, type, uuid }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

async function contextAction(action: string) {
  const { type, uuid } = contextMenu.value
  hideContextMenu()
  if (type === 'link') {
    if (action === 'resume') await store.resumeLink(uuid)
    else if (action === 'pause') await store.pauseLink(uuid)
    else if (action === 'remove') await store.removeLink(uuid)
    else if (action === 'force') await store.forceStart(uuid)
  } else {
    const pkg = store.packages.find(p => p.uuid === uuid)
    if (!pkg) return
    for (const link of pkg.links) {
      if (action === 'resume') await store.resumeLink(link.uuid)
      else if (action === 'pause') await store.pauseLink(link.uuid)
      else if (action === 'remove') await store.removeLink(link.uuid)
      else if (action === 'force') await store.forceStart(link.uuid)
    }
  }
}
</script>

<template>
  <div class="flex-1 overflow-auto" @click="hideContextMenu">
    <table class="w-full border-collapse text-xs">
      <thead class="sticky top-0 z-10">
        <tr class="bg-gray-200 border-b border-gray-400 text-gray-700 font-medium text-left">
          <th class="pl-7 pr-1 py-1">Nome</th>
          <th class="px-1 py-1 text-right hidden sm:table-cell">Dimensione</th>
          <th class="px-1 py-1 hidden sm:table-cell">Hoster</th>
          <th class="px-1 py-1 text-center hidden md:table-cell">Conn.</th>
          <th class="px-1 py-1 hidden sm:table-cell">Stato</th>
          <th class="px-1 py-1 text-right hidden md:table-cell">Velocità</th>
          <th class="px-1 py-1 text-right hidden md:table-cell">ETA</th>
          <th class="px-1 py-1 text-right hidden md:table-cell">Scaricato</th>
          <th class="px-1 py-1 min-w-[80px]">Progresso</th>
          <th class="px-1 py-1 hidden lg:table-cell">Commento</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="pkg in store.packages" :key="pkg.uuid">
          <PackageRow
            :pkg="pkg"
            :expanded="expandedPackages.has(pkg.uuid)"
            :selected="pkg.links.length > 0 && pkg.links.every(l => selectedLinks.has(l.uuid))"
            @toggle="togglePackage(pkg.uuid)"
            @select="selectPackage(pkg.uuid, $event)"
            @contextmenu="showContextMenu($event, 'package', pkg.uuid)"
          />
          <template v-if="expandedPackages.has(pkg.uuid)">
            <LinkRow
              v-for="link in pkg.links"
              :key="link.uuid"
              :link="link"
              :selected="selectedLinks.has(link.uuid)"
              @select="selectLink(link.uuid, $event)"
              @contextmenu="showContextMenu($event, 'link', link.uuid)"
            />
          </template>
        </template>
        <tr v-if="store.packages.length === 0">
          <td colspan="10" class="text-center py-8 text-gray-400">
            Nessun download in corso
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[150px] text-xs"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="contextAction('resume')"
      >
        Avvia
      </button>
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="contextAction('pause')"
      >
        Pausa
      </button>
      <button
        class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
        @click="contextAction('force')"
      >
        Forza avvio
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
