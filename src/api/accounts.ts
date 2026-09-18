import { jdCall } from './client'

/**
 * A single premium account as returned by `/accountsV2/listAccounts`.
 *
 * JD2 omits fields that have no value (e.g. traffic for unlimited accounts).
 */
export interface Account {
  /** Unique identifier of this account. */
  uuid: number
  /** Hosting service domain (e.g. `rapidgator.net`). */
  hostname: string
  /** Login / username for this account. */
  username?: string
  /** Whether the account is currently enabled. */
  enabled: boolean
  /** Whether JD2 considers the account valid. */
  valid: boolean
  /** Expiry timestamp (ms since epoch), if known. */
  validUntil?: number
  /** Traffic remaining in bytes, if limited. */
  trafficLeft?: number
  /** Maximum traffic in bytes, if limited. */
  trafficMax?: number
  /** Error type (e.g. `INVALID`, `EXPIRED`, `TEMP_DISABLED`), if any. */
  errorType?: string
  /** Human-readable error message, if any. */
  errorString?: string
}

/** Fields requested from `/accountsV2/listAccounts` (JD2 returns only what is asked for). */
const ACCOUNT_QUERY = {
  userName: true,
  enabled: true,
  valid: true,
  validUntil: true,
  trafficLeft: true,
  trafficMax: true,
  error: true,
}

/**
 * Fetch all configured premium accounts.
 *
 * @returns Array of accounts with their current status information
 */
export function listAccounts(): Promise<Account[]> {
  return jdCall<Account[]>('/accountsV2/listAccounts', ACCOUNT_QUERY)
}

/**
 * Add a new premium account.
 *
 * @param hoster - Hosting service domain (e.g. `rapidgator.net`)
 * @param username - Account login / e-mail
 * @param password - Account password (transmitted in plain text to localhost)
 */
export function addAccount(hoster: string, username: string, password: string): Promise<void> {
  return jdCall('/accountsV2/addAccount', hoster, username, password)
}

/**
 * Remove one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to remove
 */
export function removeAccounts(accountIds: number[]): Promise<void> {
  return jdCall('/accountsV2/removeAccounts', accountIds)
}

/**
 * Enable one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to enable
 */
export function enableAccounts(accountIds: number[]): Promise<void> {
  return jdCall('/accountsV2/enableAccounts', accountIds)
}

/**
 * Disable one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to disable
 */
export function disableAccounts(accountIds: number[]): Promise<void> {
  return jdCall('/accountsV2/disableAccounts', accountIds)
}

/**
 * Force a validity re-check for one or more premium accounts.
 *
 * @param accountIds - UUIDs of the accounts to refresh
 */
export function refreshAccounts(accountIds: number[]): Promise<void> {
  return jdCall('/accountsV2/refreshAccounts', accountIds)
}
