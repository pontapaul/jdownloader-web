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
      links.value = await queryLinks()
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

  return {
    links,
    packages,
    fetchLinks,
    pauseLink,
    resumeLink,
    removeLink,
    forceStart,
    cleanFinished,
    startPolling,
    stopPolling,
  }
})
