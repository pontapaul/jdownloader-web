<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useDownloadsStore } from '@/stores/downloads'
import { useExtractionStore } from '@/stores/extraction'

const appStore = useAppStore()
const downloadsStore = useDownloadsStore()
const extractionStore = useExtractionStore()

// Archive passwords
const newPassword = ref('')
const passwordsError = ref<string | null>(null)

async function passwordAction(action: () => Promise<void>) {
  passwordsError.value = null
  try {
    await action()
  } catch (err) {
    passwordsError.value = err instanceof Error ? err.message : 'Errore di JD2'
  }
}

async function addPassword() {
  const value = newPassword.value.trim()
  if (!value) return
  await passwordAction(() => extractionStore.rememberPasswords([value]))
  newPassword.value = ''
}

onMounted(() => passwordAction(() => extractionStore.fetchPasswords()))

const apiUrlInput = ref(appStore.apiBaseUrl)
const pollIntervalInput = ref(appStore.pollInterval)
const isTesting = ref(false)

async function handleTestAndSave() {
  isTesting.value = true
  await appStore.saveApiBaseUrl(apiUrlInput.value)
  isTesting.value = false
}

function handlePollIntervalChange() {
  const clamped = Math.max(500, Math.min(10000, pollIntervalInput.value))
  pollIntervalInput.value = clamped
  appStore.savePollInterval(clamped)
  downloadsStore.restartPolling()
}

// Keep local input in sync if store value changes externally
watch(() => appStore.apiBaseUrl, (val) => { apiUrlInput.value = val })
watch(() => appStore.pollInterval, (val) => { pollIntervalInput.value = val })
</script>

<template>
  <div class="p-4 max-w-lg space-y-6">
    <h1 class="text-lg font-semibold">Impostazioni</h1>

    <!-- API URL -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Connessione JDownloader2</h2>
      <div class="flex gap-2">
        <input
          v-model="apiUrlInput"
          type="text"
          placeholder="http://localhost:3128"
          class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          @keydown.enter="handleTestAndSave"
        />
        <button
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          :disabled="isTesting"
          @click="handleTestAndSave"
        >
          {{ isTesting ? 'Test…' : 'Test connessione' }}
        </button>
      </div>

      <!-- Connection test result -->
      <div
        v-if="appStore.connectionTestResult"
        class="text-sm px-3 py-2 rounded"
        :class="appStore.connectionTestResult.ok
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'"
      >
        <template v-if="appStore.connectionTestResult.ok">
          Connesso — JDownloader2 build {{ appStore.connectionTestResult.version }}
        </template>
        <template v-else>
          Errore: {{ appStore.connectionTestResult.error }}
        </template>
      </div>
    </section>

    <!-- Poll interval -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Aggiornamento automatico</h2>
      <label class="flex items-center gap-3 text-sm">
        <span class="text-gray-600 w-36 shrink-0">Intervallo di polling</span>
        <input
          v-model.number="pollIntervalInput"
          type="number"
          min="500"
          max="10000"
          step="500"
          class="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          @change="handlePollIntervalChange"
        />
        <span class="text-gray-500">ms (500 – 10 000)</span>
      </label>
    </section>

    <!-- Archive passwords -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Password archivi</h2>
      <p class="text-xs text-gray-500">
        JDownloader2 le prova su ogni archivio. Qui finiscono le password inserite aggiungendo link o
        riprovando un'estrazione, e quelle che JD2 trova da solo.
      </p>
      <ul class="border border-gray-200 rounded divide-y divide-gray-100 text-sm">
        <li
          v-for="password in extractionStore.passwords"
          :key="password"
          class="flex items-center gap-2 px-2 py-1"
        >
          <span class="flex-1 font-mono text-xs break-all">{{ password }}</span>
          <button
            class="text-xs text-red-600 hover:underline"
            @click="passwordAction(() => extractionStore.forgetPassword(password))"
          >
            Rimuovi
          </button>
        </li>
        <li v-if="extractionStore.passwords.length === 0" class="px-2 py-1 text-xs text-gray-400">
          Nessuna password salvata
        </li>
      </ul>
      <div class="flex gap-2">
        <input
          v-model="newPassword"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Nuova password"
          class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          @keydown.enter="addPassword"
        />
        <button
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          :disabled="!newPassword.trim()"
          @click="addPassword"
        >
          Aggiungi
        </button>
      </div>
      <p v-if="passwordsError" class="text-xs text-red-600">{{ passwordsError }}</p>
    </section>

    <!-- Notifications -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Notifiche</h2>
      <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          v-model="appStore.showCompletionToasts"
          type="checkbox"
          class="w-4 h-4"
          @change="appStore.watchCompletionToasts()"
        />
        Mostra notifica al completamento del download
      </label>
    </section>
  </div>
</template>
