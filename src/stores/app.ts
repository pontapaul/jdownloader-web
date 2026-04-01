import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getJdVersion } from '../api/client'
import { getSpeedLimit, setSpeedLimit } from '../api/config'
import { useDownloadsStore } from './downloads'

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
  }
})
