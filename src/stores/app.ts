import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getJdVersion } from '../api/client'
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

  const showAddLinksModal = ref(false)

  return { connected, apiBaseUrl, pollInterval, globalSpeed, checkConnection, showAddLinksModal }
})
