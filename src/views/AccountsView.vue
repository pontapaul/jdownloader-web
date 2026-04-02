<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAccountsStore } from '@/stores/accounts'
import { useFormatters } from '@/composables/useFormatters'
import type { Account } from '@/api/accounts'

const accountsStore = useAccountsStore()
const { formatSize } = useFormatters()

// ── Add account form ──────────────────────────────────────────────────────────
const showAddForm = ref(false)
const addHoster = ref('')
const addUsername = ref('')
const addPassword = ref('')
const addError = ref<string | null>(null)
const addLoading = ref(false)

async function submitAddAccount() {
  if (!addHoster.value.trim() || !addUsername.value.trim() || !addPassword.value.trim()) {
    addError.value = 'Compila tutti i campi'
    return
  }
  addLoading.value = true
  addError.value = null
  try {
    await accountsStore.addNewAccount(
      addHoster.value.trim(),
      addUsername.value.trim(),
      addPassword.value,
    )
    addHoster.value = ''
    addUsername.value = ''
    addPassword.value = ''
    showAddForm.value = false
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Errore durante l\'aggiunta dell\'account'
  } finally {
    addLoading.value = false
  }
}

function cancelAdd() {
  showAddForm.value = false
  addHoster.value = ''
  addUsername.value = ''
  addPassword.value = ''
  addError.value = null
}

// ── Remove confirmation ───────────────────────────────────────────────────────
const confirmRemoveUuid = ref<number | null>(null)

function requestRemove(uuid: number) {
  confirmRemoveUuid.value = uuid
}

async function confirmRemove() {
  if (confirmRemoveUuid.value === null) return
  await accountsStore.removeAccount(confirmRemoveUuid.value)
  confirmRemoveUuid.value = null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusLabel(account: Account): string {
  if (!account.enabled) return 'Disabilitato'
  if (account.valid) return 'Valido'
  if (account.status) return account.status
  return 'Sconosciuto'
}

function statusClass(account: Account): string {
  if (!account.enabled) return 'text-gray-400'
  if (account.valid) return 'text-green-600'
  return 'text-red-500'
}

function trafficLabel(account: Account): string {
  if (account.trafficLeft < 0) return 'Illimitato'
  return formatSize(account.trafficLeft)
}

const confirmRemoveAccount = computed(() =>
  accountsStore.accounts.find(a => a.uuid === confirmRemoveUuid.value) ?? null,
)

onMounted(() => {
  accountsStore.fetchAccounts()
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 py-1 bg-gray-100 border-b border-gray-300 shrink-0">
      <!-- Refresh all -->
      <button
        class="p-1 rounded hover:bg-gray-200 active:bg-gray-300 text-gray-700 disabled:opacity-40"
        title="Ricontrolla tutti gli account"
        :disabled="accountsStore.accounts.length === 0 || accountsStore.loading"
        @click="accountsStore.refreshAll()"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>

      <!-- Add account -->
      <button
        class="p-1 rounded hover:bg-gray-200 active:bg-gray-300 text-gray-700 disabled:opacity-40"
        title="Aggiungi account"
        @click="showAddForm = true"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>

    <!-- Add account form -->
    <div
      v-if="showAddForm"
      class="px-3 py-2 bg-blue-50 border-b border-blue-200 shrink-0"
    >
      <div class="text-xs font-semibold text-blue-700 mb-2">Aggiungi account premium</div>
      <div class="flex flex-wrap gap-2 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Hoster</label>
          <input
            v-model="addHoster"
            type="text"
            placeholder="rapidgator.net"
            class="border border-gray-300 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            @keydown.enter="submitAddAccount"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Username / Email</label>
          <input
            v-model="addUsername"
            type="text"
            placeholder="utente@esempio.com"
            class="border border-gray-300 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            @keydown.enter="submitAddAccount"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Password</label>
          <input
            v-model="addPassword"
            type="password"
            placeholder="••••••••"
            class="border border-gray-300 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
            @keydown.enter="submitAddAccount"
          />
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="addLoading"
            @click="submitAddAccount"
          >
            {{ addLoading ? 'Aggiunta…' : 'Aggiungi' }}
          </button>
          <button
            class="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            @click="cancelAdd"
          >
            Annulla
          </button>
        </div>
      </div>
      <div v-if="addError" class="mt-1 text-xs text-red-600">{{ addError }}</div>
      <p class="mt-1 text-xs text-gray-400">
        Le credenziali vengono trasmesse in chiaro a localhost:3128 (accesso consentito solo via VPN).
      </p>
    </div>

    <!-- Error banner -->
    <div
      v-if="accountsStore.error"
      class="px-3 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700 shrink-0"
    >
      {{ accountsStore.error }}
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full text-xs border-collapse">
        <thead class="sticky top-0 bg-gray-100 border-b border-gray-300 z-10">
          <tr>
            <th class="text-left px-2 py-1.5 font-semibold text-gray-600 w-8"></th>
            <th class="text-left px-2 py-1.5 font-semibold text-gray-600">Hoster</th>
            <th class="text-left px-2 py-1.5 font-semibold text-gray-600">Username</th>
            <th class="text-left px-2 py-1.5 font-semibold text-gray-600">Stato</th>
            <th class="text-left px-2 py-1.5 font-semibold text-gray-600 hidden sm:table-cell">Traffico rimanente</th>
            <th class="text-center px-2 py-1.5 font-semibold text-gray-600 w-16">Abilitato</th>
            <th class="px-2 py-1.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <tr v-if="accountsStore.loading && accountsStore.accounts.length === 0">
            <td colspan="7" class="px-3 py-6 text-center text-gray-400">
              Caricamento…
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-else-if="!accountsStore.loading && accountsStore.accounts.length === 0">
            <td colspan="7" class="px-3 py-6 text-center text-gray-400">
              Nessun account premium configurato.
              <button
                class="ml-1 text-blue-600 hover:underline"
                @click="showAddForm = true"
              >
                Aggiungi il primo account.
              </button>
            </td>
          </tr>

          <!-- Account rows -->
          <tr
            v-for="account in accountsStore.accounts"
            :key="account.uuid"
            class="border-b border-gray-100 hover:bg-gray-50"
            :class="{ 'opacity-50': !account.enabled }"
          >
            <!-- Hoster favicon -->
            <td class="px-2 py-1.5 text-center">
              <img
                :src="`https://www.google.com/s2/favicons?sz=16&domain=${account.hoster}`"
                :alt="account.hoster"
                class="w-4 h-4 inline-block"
                loading="lazy"
              />
            </td>

            <!-- Hoster -->
            <td class="px-2 py-1.5 font-medium text-gray-800">{{ account.hoster }}</td>

            <!-- Username -->
            <td class="px-2 py-1.5 text-gray-600 max-w-[160px] truncate" :title="account.username">
              {{ account.username }}
            </td>

            <!-- Status -->
            <td class="px-2 py-1.5">
              <span :class="statusClass(account)">{{ statusLabel(account) }}</span>
              <span v-if="account.error" class="ml-1 text-red-400" :title="account.error">(!)</span>
            </td>

            <!-- Traffic left -->
            <td class="px-2 py-1.5 text-gray-600 hidden sm:table-cell">
              {{ trafficLabel(account) }}
            </td>

            <!-- Enabled toggle -->
            <td class="px-2 py-1.5 text-center">
              <input
                type="checkbox"
                :checked="account.enabled"
                class="w-4 h-4 cursor-pointer"
                @change="accountsStore.toggleEnabled(account.uuid, !account.enabled)"
              />
            </td>

            <!-- Remove button -->
            <td class="px-2 py-1.5 text-center">
              <button
                class="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                title="Rimuovi account"
                @click="requestRemove(account.uuid)"
              >
                <svg viewBox="0 0 24 24" class="w-4 h-4">
                  <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Remove confirmation dialog -->
    <div
      v-if="confirmRemoveUuid !== null"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="confirmRemoveUuid = null"
    >
      <div class="bg-white rounded shadow-xl p-5 max-w-sm w-full mx-4">
        <h2 class="text-sm font-semibold text-gray-800 mb-2">Rimuovi account</h2>
        <p class="text-sm text-gray-600 mb-4">
          Vuoi rimuovere l'account
          <strong>{{ confirmRemoveAccount?.username }}</strong>
          su <strong>{{ confirmRemoveAccount?.hoster }}</strong>?
          Questa operazione non può essere annullata.
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            @click="confirmRemoveUuid = null"
          >
            Annulla
          </button>
          <button
            class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            @click="confirmRemove"
          >
            Rimuovi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
