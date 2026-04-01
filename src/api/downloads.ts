import { jdFetch } from './client'

/** Priority levels supported by JDownloader2. */
export type DownloadPriority = 'HIGHEST' | 'HIGHER' | 'HIGH' | 'DEFAULT' | 'LOW' | 'LOWER' | 'LOWEST'

/** A single download link as returned by `/downloadsV2/queryLinks`. */
export interface DownloadLink {
  /** Unique identifier of this link. */
  uuid: number
  /** Display name of the file. */
  name: string
  /** Hosting domain (e.g. `rapidgator.net`). */
  host: string
  /** Human-readable status label (e.g. `Downloading`, `Finished`, `Error`). */
  status: string
  /** Total file size in bytes (`-1` if unknown). */
  bytesTotal: number
  /** Bytes downloaded so far. */
  bytesLoaded: number
  /** Current download speed in bytes/s. */
  speed: number
  /** Estimated time remaining in seconds (`-1` if not available). */
  eta: number
  /** Whether the link is enabled (not paused). */
  enabled: boolean
  /** UUID of the package this link belongs to. */
  packageUUID: number
  /** Download priority. */
  priority: DownloadPriority
  /** Whether the download has finished successfully. */
  finished: boolean
  /** Whether the link is currently being downloaded. */
  running: boolean
  /** Whether the link has been skipped. */
  skipped: boolean
  /** Timestamp (ms since epoch) when the link was added. */
  addedDate: number
  /** Comment attached to the link, if any. */
  comment: string | null
}

/** Query parameters accepted by `/downloadsV2/queryLinks`. */
export interface QueryLinksParams {
  /** Filter results to these package UUIDs. */
  packageUUIDs?: number[]
  /** Filter results to these link UUIDs. */
  linkUUIDs?: number[]
  /** Maximum number of links to return. */
  maxResults?: number
  /** Zero-based offset into the full result list. */
  startAt?: number
}

/**
 * Fetch the current download list.
 *
 * @param params - Optional filters (package/link UUIDs, pagination)
 * @returns Array of download links with status, progress and speed information
 */
export function queryLinks(params?: QueryLinksParams): Promise<DownloadLink[]> {
  return jdFetch<DownloadLink[]>('/downloadsV2/queryLinks', {
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  })
}

/**
 * Enable or disable (pause/resume) a set of download links.
 *
 * @param linkIds - UUIDs of the links to modify
 * @param enabled - `true` to resume, `false` to pause
 */
export function setEnabled(linkIds: number[], enabled: boolean): Promise<void> {
  return jdFetch('/downloadsV2/setEnabled', {
    method: 'POST',
    body: JSON.stringify({ linkIds, enabled }),
  })
}

/**
 * Permanently remove download links from the list.
 *
 * @param linkIds - UUIDs of the links to remove
 */
export function removeLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/downloadsV2/removeLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

/**
 * Force-start a set of download links regardless of queue position or slot limits.
 *
 * @param linkIds - UUIDs of the links to force-start
 */
export function forcedDownload(linkIds: number[]): Promise<void> {
  return jdFetch('/downloadsV2/forcedDownload', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

/**
 * Clean up finished and/or failed links from the download list.
 *
 * When called without arguments all finished/failed links are removed.
 *
 * @param linkIds - Optional subset of link UUIDs to clean up
 */
export function cleanup(linkIds?: number[]): Promise<void> {
  return jdFetch('/downloadsV2/cleanup', {
    method: 'POST',
    body: JSON.stringify(linkIds ? { linkIds } : {}),
  })
}
