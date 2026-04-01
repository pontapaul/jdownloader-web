import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getJdVersion, setApiBaseUrl } from '../api/client'
import { getSpeedLimit, setSpeedLimit } from '../api/config'
import { useDownloadsStore } from './downloads'

export interface Toast {
  id: number
  message: string
}

export interface ConnectionTestResult {
  ok: boolean
  version?: number
  error?: string
}

export const useAppStore = defineStore('app', () => {
  const connected = ref(false)
  const apiBaseUrl = ref(
    localStorage.getItem('apiBaseUrl') ??
    (import.meta.env.VITE_JD_API_URL as string | undefined) ??
    'http://localhost:3128',
  )
  const pollInterval = ref(
    parseInt(localStorage.getItem('pollInterval') ?? '2000', 10),
  )

  // Sync the API client's base URL with the persisted value on startup
  setApiBaseUrl(apiBaseUrl.value)

  const connectionTestResult = ref<ConnectionTestResult | null>(null)

  const globalSpeed = computed(() => {
    const downloadsStore = useDownloadsStore()
    return downloadsStore.links.reduce((sum, link) => sum + (link.speed ?? 0), 0)
  })

  async function checkConnection(): Promise<void> {
    try {
      await getJdVersion()
      connected.value = true
    } catch {
      connected.value = false
    }
  }

  async function saveApiBaseUrl(url: string): Promise<void> {
    apiBaseUrl.value = url
    localStorage.setItem('apiBaseUrl', url)
    setApiBaseUrl(url)
    await testConnection()
  }

  function savePollInterval(ms: number): void {
    pollInterval.value = ms
    localStorage.setItem('pollInterval', String(ms))
  }

  async function testConnection(): Promise<void> {
    connectionTestResult.value = null
    try {
      const info = await getJdVersion()
      connected.value = true
      connectionTestResult.value = { ok: true, version: info.version }
    } catch (err) {
      connected.value = false
      connectionTestResult.value = {
        ok: false,
        error: err instanceof Error ? err.message : 'Errore sconosciuto',
      }
    }
  }

  /** Current speed limit in bytes/s; 0 = unlimited. */
  const speedLimit = ref(0)

  async function fetchSpeedLimit(): Promise<void> {
    try {
      speedLimit.value = await getSpeedLimit()
    } catch {
      // ignore — JD2 may not support this config key
    }
  }

  async function applySpeedLimit(bytesPerSec: number): Promise<void> {
    await setSpeedLimit(bytesPerSec)
    speedLimit.value = bytesPerSec
  }

  const showAddLinksModal = ref(false)

  // ── Toast notifications ───────────────────────────────────────────────────
  const showCompletionToasts = ref(
    localStorage.getItem('showCompletionToasts') !== 'false',
  )
  const toasts = ref<Toast[]>([])
  let toastSeq = 0

  function watchCompletionToasts() {
    localStorage.setItem('showCompletionToasts', String(showCompletionToasts.value))
  }

  function addToast(message: string): void {
    const id = ++toastSeq
    toasts.value.push({ id, message })
    setTimeout(() => dismissToast(id), 5000)
  }

  function dismissToast(id: number): void {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return {
    connected,
    apiBaseUrl,
    pollInterval,
    connectionTestResult,
    globalSpeed,
    speedLimit,
    checkConnection,
    saveApiBaseUrl,
    savePollInterval,
    testConnection,
    fetchSpeedLimit,
    applySpeedLimit,
    showAddLinksModal,
    showCompletionToasts,
    watchCompletionToasts,
    toasts,
    addToast,
    dismissToast,
  }
})
