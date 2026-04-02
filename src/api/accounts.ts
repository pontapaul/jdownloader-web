import { jdFetch } from './client'

/** Validity states reported by JDownloader2 for a premium account. */
export type AccountValidity = 'VALID' | 'INVALID' | 'EXPIRED' | 'TEMP_DISABLED' | 'UNKNOWN'

/** A single premium account as returned by `/accountsV2/listAccounts`. */
export interface Account {
  /** Unique identifier of this account. */
  uuid: number
  /** Hosting service domain (e.g. `rapidgator.net`). */
  hoster: string
  /** Login / username for this account. */
  username: string
  /** Current validity status. */
  validUntil: number
  /** Whether the account is currently enabled. */
  enabled: boolean
  /** Traffic remaining in bytes (`-1` if unlimited or unknown). */
  trafficLeft: number
  /** Maximum traffic in bytes (`-1` if unlimited or unknown). */
  trafficMax: number
  /** Human-readable error message, if any. */
  error: string | null
  /** Account validity status. */
  valid: boolean
  /** Account status string from JD2. */
  status: string | null
}

/**
 * Fetch all configured premium accounts.
 *
 * @returns Array of accounts with their current status information
 */
export function listAccounts(): Promise<Account[]> {
  return jdFetch<Account[]>('/accountsV2/listAccounts', {
    method: 'GET',
  })
}

/**
 * Add a new premium account.
 *
 * @param hoster - Hosting service domain (e.g. `rapidgator.net`)
 * @param username - Account login / e-mail
 * @param password - Account password (transmitted in plain text to localhost)
 */
export function addAccount(hoster: string, username: string, password: string): Promise<void> {
  return jdFetch('/accountsV2/addAccount', {
    method: 'POST',
    body: JSON.stringify({ hoster, username, password }),
  })
}

/**
 * Remove one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to remove
 */
export function removeAccounts(accountIds: number[]): Promise<void> {
  return jdFetch('/accountsV2/removeAccounts', {
    method: 'POST',
    body: JSON.stringify({ accountIds }),
  })
}

/**
 * Enable one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to enable
 */
export function enableAccounts(accountIds: number[]): Promise<void> {
  return jdFetch('/accountsV2/enableAccounts', {
    method: 'POST',
    body: JSON.stringify({ accountIds }),
  })
}

/**
 * Disable one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to disable
 */
export function disableAccounts(accountIds: number[]): Promise<void> {
  return jdFetch('/accountsV2/disableAccounts', {
    method: 'POST',
    body: JSON.stringify({ accountIds }),
  })
}

/**
 * Force a validity re-check for one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to refresh
 */
export function refreshAccounts(accountIds: number[]): Promise<void> {
  return jdFetch('/accountsV2/refreshAccounts', {
    method: 'POST',
    body: JSON.stringify({ accountIds }),
  })
}
