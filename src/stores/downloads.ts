import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import {
  queryLinks,
  queryPackages,
  setEnabled,
  removeLinks,
  forceDownload,
  cleanup,
  getControllerState,
  startDownloads,
  stopDownloads,
  type ControllerState,
  type DownloadLink,
  type PackageInfo,
} from '../api/downloads'
import { movePackage } from '../api/mover'

export interface DownloadPackage {
  uuid: number
  links: DownloadLink[]
  /** Name, save folder and comment, when known. */
  info?: PackageInfo
}

export const useDownloadsStore = defineStore('downloads', () => {
  const links = ref<DownloadLink[]>([])
  const packageInfo = ref(new Map<number, PackageInfo>())
  /** JD2's download engine: with `STOPPED_STATE` nothing runs, whatever the links say. */
  const controllerState = ref<ControllerState | null>(null)
  /** True when JD2's download engine is stopped (play is needed, not the links). */
  const engineStopped = computed(
    () => controllerState.value === 'STOPPED_STATE' || controllerState.value === 'IDLE',
  )
  let timer: ReturnType<typeof setInterval> | null = null
  /** UUIDs of the packages that were complete on the last fetch; `null` before the first one. */
  let prevFinishedPackages: Set<number> | null = null

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
    return Array.from(map.entries()).map(([uuid, pkgLinks]) => ({
      uuid,
      links: pkgLinks,
      info: packageInfo.value.get(uuid),
    }))
  })

  async function fetchLinks(): Promise<void> {
    try {
      const [fresh, infos, state] = await Promise.all([
        queryLinks(),
        queryPackages(),
        getControllerState(),
      ])
      packageInfo.value = new Map(infos.map(p => [p.uuid, p]))
      controllerState.value = state
      const appStore = useAppStore()
      // One toast per package when its last link finishes (not at page load,
      // and not for every volume of a multi-part archive)
      const byPackage = new Map<number, DownloadLink[]>()
      for (const link of fresh) {
        const pkgLinks = byPackage.get(link.packageUUID)
        if (pkgLinks) pkgLinks.push(link)
        else byPackage.set(link.packageUUID, [link])
      }
      const finishedPackages = new Set(
        [...byPackage].filter(([, pkgLinks]) => pkgLinks.every(l => l.finished)).map(([uuid]) => uuid),
      )
      if (prevFinishedPackages && appStore.showCompletionToasts) {
        for (const uuid of finishedPackages) {
          if (prevFinishedPackages.has(uuid)) continue
          const name = packageInfo.value.get(uuid)?.name ?? byPackage.get(uuid)?.[0]?.name
          appStore.addToast(`Download completato: ${name}`)
        }
      }
      prevFinishedPackages = finishedPackages
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
    await forceDownload([uuid])
    await fetchLinks()
  }

  /** Move a package (files included) to another staging folder, e.g. a different title. */
  async function moveToFolder(uuid: number, directory: string): Promise<void> {
    await movePackage(uuid, directory)
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

  /** Enable every paused link and start JD2's download engine (the desktop "play"). */
  async function resumeAll(): Promise<void> {
    const ids = links.value.filter(l => !l.enabled && !l.finished).map(l => l.uuid)
    if (ids.length) await setEnabled(ids, true)
    // Enabled links do not download while the engine is stopped (after "stop", or
    // when the last forced download ended): this is what makes them start
    await startDownloads()
    await fetchLinks()
  }

  /** Stop JD2's download engine; the links keep their state and resume with play. */
  async function stopAll(): Promise<void> {
    await stopDownloads()
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

  function restartPolling(): void {
    stopPolling()
    startPolling()
  }

  return {
    links,
    packages,
    controllerState,
    engineStopped,
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
    moveToFolder,
    cleanFinished,
    startPolling,
    stopPolling,
    restartPolling,
  }
})
