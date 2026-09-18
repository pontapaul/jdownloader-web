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
