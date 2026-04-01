import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getJdVersion } from '../api/client'
import { getSpeedLimit, setSpeedLimit } from '../api/config'
import { useDownloadsStore } from './downloads'

export interface Toast {
  id: number
  message: string
}

export const useAppStore = defineStore('app', () => {
  const connected = ref(false)
  const apiBaseUrl = ref(import.meta.env.VITE_JD_API_URL ?? 'http://localhost:3128')
  const pollInterval = ref(2000)

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
    globalSpeed,
    speedLimit,
    checkConnection,
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
