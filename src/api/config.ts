import { jdFetch } from './client'

const GENERAL_SETTINGS = 'org.jdownloader.settings.GeneralSettings'

/**
 * Fetch the global download speed limit from JD2 config.
 *
 * @returns Speed limit in bytes/s; `0` means unlimited.
 */
export function getSpeedLimit(): Promise<number> {
  return jdFetch<number>('/config/get', {
    method: 'POST',
    body: JSON.stringify({
      configInterface: GENERAL_SETTINGS,
      key: 'MaxDownloadSpeed',
    }),
  })
}

/**
 * Set the global download speed limit in JD2 config.
 *
 * @param bytesPerSec - Limit in bytes/s; pass `0` to disable limiting.
 */
export function setSpeedLimit(bytesPerSec: number): Promise<void> {
  return jdFetch('/config/set', {
    method: 'POST',
    body: JSON.stringify({
      configInterface: GENERAL_SETTINGS,
      key: 'MaxDownloadSpeed',
      value: bytesPerSec,
    }),
  })
}
