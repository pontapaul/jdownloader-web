import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getPasswordList,
  setPasswordList,
  retryExtraction,
  listPasswordPrompts,
  answerPasswordPrompt,
  type PasswordPrompt,
} from '../api/extraction'

export const useExtractionStore = defineStore('extraction', () => {
  /** Global archive password list (tried by JD2 on every archive). */
  const passwords = ref<string[]>([])
  /** Password requests JD2 is waiting for. */
  const prompts = ref<PasswordPrompt[]>([])

  async function fetchPasswords(): Promise<void> {
    passwords.value = await getPasswordList()
  }

  /** Add passwords to the global list (every password the user types ends up here). */
  async function rememberPasswords(added: string[]): Promise<void> {
    const current = await getPasswordList()
    const merged = [...current]
    for (const password of added) {
      if (password && !merged.includes(password)) merged.push(password)
    }
    if (merged.length !== current.length) await setPasswordList(merged)
    passwords.value = merged
  }

  async function forgetPassword(password: string): Promise<void> {
    const list = (await getPasswordList()).filter(p => p !== password)
    await setPasswordList(list)
    passwords.value = list
  }

  async function fetchPrompts(): Promise<void> {
    try {
      prompts.value = await listPasswordPrompts()
    } catch {
      // Silently fail; connection status is managed by useAppStore
    }
  }

  async function answerPrompt(id: number, password: string | null): Promise<void> {
    if (password !== null) await rememberPasswords([password])
    await answerPasswordPrompt(id, password)
    await fetchPrompts()
  }

  async function retryWithPassword(packageUuid: number, password: string): Promise<void> {
    await rememberPasswords([password])
    await retryExtraction(packageUuid, password)
  }

  return {
    passwords,
    prompts,
    fetchPasswords,
    rememberPasswords,
    forgetPassword,
    fetchPrompts,
    answerPrompt,
    retryWithPassword,
  }
})
