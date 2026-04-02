import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listAccounts,
  addAccount,
  removeAccounts,
  enableAccounts,
  disableAccounts,
  refreshAccounts,
  type Account,
} from '../api/accounts'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAccounts(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      accounts.value = await listAccounts()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Errore durante il caricamento degli account'
    } finally {
      loading.value = false
    }
  }

  async function addNewAccount(hoster: string, username: string, password: string): Promise<void> {
    await addAccount(hoster, username, password)
    await fetchAccounts()
  }

  async function removeAccount(uuid: number): Promise<void> {
    await removeAccounts([uuid])
    await fetchAccounts()
  }

  async function toggleEnabled(uuid: number, enabled: boolean): Promise<void> {
    if (enabled) {
      await enableAccounts([uuid])
    } else {
      await disableAccounts([uuid])
    }
    await fetchAccounts()
  }

  async function refreshAll(): Promise<void> {
    const ids = accounts.value.map(a => a.uuid)
    if (ids.length) {
      await refreshAccounts(ids)
      await fetchAccounts()
    }
  }

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    addNewAccount,
    removeAccount,
    toggleEnabled,
    refreshAll,
  }
})
