import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import {
  queryLinks,
  setEnabled,
  removeLinks,
  forcedDownload,
  cleanup,
  type DownloadLink,
} from '../api/downloads'

export interface DownloadPackage {
  uuid: number
  links: DownloadLink[]
}

export const useDownloadsStore = defineStore('downloads', () => {
  const links = ref<DownloadLink[]>([])
  let timer: ReturnType<typeof setInterval> | null = null
  /** UUIDs of links that were already finished on the last fetch. */
  const prevFinishedUuids = new Set<number>()

  /** True when every non-finished link is disabled (all paused/stopped). */
  const allPaused = computed(() =>
    links.value.length > 0 && links.value.every(l => l.finished || !l.enabled),
  )

  /** True when at least one link is actively downloading. */
  const hasActiveDownloads = computed(() => links.value.some(l => l.running))

  const packages = computed<DownloadPackage[]>(() => {
    const map = new Map<number, DownloadLink[]>()
    for (const link of links.value) {
      const pkg = map.get(link.packageUUID)
      if (pkg) {
        pkg.push(link)
      } else {
        map.set(link.packageUUID, [link])
      }
    }
    return Array.from(map.entries()).map(([uuid, pkgLinks]) => ({ uuid, links: pkgLinks }))
  })

  async function fetchLinks(): Promise<void> {
    try {
      const fresh = await queryLinks()
      // Detect newly completed downloads and fire toasts
      const appStore = useAppStore()
      if (appStore.showCompletionToasts) {
        for (const link of fresh) {
          if (link.finished && !prevFinishedUuids.has(link.uuid)) {
            appStore.addToast(`Download completato: ${link.name}`)
          }
        }
      }
      // Update the set of known-finished UUIDs
      prevFinishedUuids.clear()
      for (const link of fresh) {
        if (link.finished) prevFinishedUuids.add(link.uuid)
      }
      links.value = fresh
    } catch {
      // Silently fail; connection status is managed by useAppStore
    }
  }

  async function pauseLink(uuid: number): Promise<void> {
    await setEnabled([uuid], false)
    await fetchLinks()
  }

  async function resumeLink(uuid: number): Promise<void> {
    await setEnabled([uuid], true)
    await fetchLinks()
  }

  async function removeLink(uuid: number): Promise<void> {
    await removeLinks([uuid])
    await fetchLinks()
  }

  async function forceStart(uuid: number): Promise<void> {
    await forcedDownload([uuid])
    await fetchLinks()
  }

  async function cleanFinished(): Promise<void> {
    await cleanup()
    await fetchLinks()
  }

  async function pauseAll(): Promise<void> {
    const ids = links.value.filter(l => l.enabled && !l.finished).map(l => l.uuid)
    if (ids.length) {
      await setEnabled(ids, false)
      await fetchLinks()
    }
  }

  async function resumeAll(): Promise<void> {
    const ids = links.value.filter(l => !l.enabled && !l.finished).map(l => l.uuid)
    if (ids.length) {
      await setEnabled(ids, true)
      await fetchLinks()
    }
  }

  async function stopAll(): Promise<void> {
    const ids = links.value.filter(l => !l.finished).map(l => l.uuid)
    if (ids.length) {
      await setEnabled(ids, false)
      await fetchLinks()
    }
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      fetchLinks()
    }
  }

  function startPolling(): void {
    if (timer) return
    fetchLinks()
    const appStore = useAppStore()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLinks()
      }
    }, appStore.pollInterval)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function stopPolling(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function restartPolling(): void {
    stopPolling()
    startPolling()
  }

  return {
    links,
    packages,
    allPaused,
    hasActiveDownloads,
    fetchLinks,
    pauseLink,
    resumeLink,
    pauseAll,
    resumeAll,
    stopAll,
    removeLink,
    forceStart,
    cleanFinished,
    startPolling,
    stopPolling,
    restartPolling,
  }
})
