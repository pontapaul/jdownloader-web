import { jdCall } from './client'

const GENERAL_SETTINGS = 'org.jdownloader.settings.GeneralSettings'

/** Read a JD2 config value (`config/get(interfaceName, storage, key)`). */
function getConfig<T>(key: string): Promise<T> {
  return jdCall<T>('/config/get', GENERAL_SETTINGS, null, key)
}

/** Write a JD2 config value (`config/set(interfaceName, storage, key, value)`). */
function setConfig(key: string, value: unknown): Promise<boolean> {
  return jdCall<boolean>('/config/set', GENERAL_SETTINGS, null, key, value)
}

/**
 * Fetch the global download speed limit from JD2 config.
 *
 * @returns Speed limit in bytes/s; `0` means unlimited.
 */
export async function getSpeedLimit(): Promise<number> {
  const [enabled, limit] = await Promise.all([
    getConfig<boolean>('DownloadSpeedLimitEnabled'),
    getConfig<number>('DownloadSpeedLimit'),
  ])
  return enabled ? limit : 0
}

/**
 * Set the global download speed limit in JD2 config.
 *
 * @param bytesPerSec - Limit in bytes/s; pass `0` to disable limiting.
 */
export async function setSpeedLimit(bytesPerSec: number): Promise<void> {
  if (bytesPerSec > 0) {
    await setConfig('DownloadSpeedLimit', bytesPerSec)
  }
  await setConfig('DownloadSpeedLimitEnabled', bytesPerSec > 0)
}

/** Connection limits of JD2 (Settings → Download & Connections in the desktop UI). */
export interface DownloadLimits {
  /** Downloads running at the same time (1–20). */
  maxDownloads: number
  /** Connections (chunks) per file (1–20); hosters may allow fewer. */
  maxChunks: number
  /** Downloads running at the same time on one hoster (at least 1). */
  maxPerHost: number
}

const LIMIT_KEYS: Record<keyof DownloadLimits, string> = {
  maxDownloads: 'MaxSimultaneDownloads',
  maxChunks: 'MaxChunksPerFile',
  maxPerHost: 'MaxSimultaneDownloadsPerHost',
}

/** Fetch the connection limits from JD2 config. */
export async function getDownloadLimits(): Promise<DownloadLimits> {
  const [maxDownloads, maxChunks, maxPerHost] = await Promise.all([
    getConfig<number>(LIMIT_KEYS.maxDownloads),
    getConfig<number>(LIMIT_KEYS.maxChunks),
    getConfig<number>(LIMIT_KEYS.maxPerHost),
  ])
  return { maxDownloads, maxChunks, maxPerHost }
}

/**
 * Set one connection limit in JD2 config.
 *
 * @throws {Error} When JD2 rejects the value (out of its allowed range)
 */
export async function setDownloadLimit(limit: keyof DownloadLimits, value: number): Promise<void> {
  const accepted = await setConfig(LIMIT_KEYS[limit], value)
  if (!accepted) throw new Error(`JD2 non accetta il valore ${value}`)
}
