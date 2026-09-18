import { jdCall } from './client'

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
  /** Extraction state of an archive part (`SUCCESSFUL`, `ERROR`, …), `null` if none. */
  extractionStatus: string | null
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

/** Fields requested from `/downloadsV2/queryLinks` (JD2 returns only what is asked for). */
const LINK_FIELDS = {
  addedDate: true,
  bytesLoaded: true,
  bytesTotal: true,
  comment: true,
  enabled: true,
  eta: true,
  extractionStatus: true,
  finished: true,
  host: true,
  priority: true,
  running: true,
  skipped: true,
  speed: true,
  status: true,
}

/** JD2 omits fields without a value: fill them in so every link has the full shape. */
function normalizeLink(raw: Partial<DownloadLink> & Pick<DownloadLink, 'uuid' | 'name' | 'packageUUID'>): DownloadLink {
  return {
    host: '',
    status: '',
    bytesTotal: -1,
    bytesLoaded: 0,
    speed: 0,
    eta: -1,
    enabled: false,
    priority: 'DEFAULT',
    finished: false,
    running: false,
    skipped: false,
    addedDate: 0,
    comment: null,
    extractionStatus: null,
    ...raw,
  }
}

/**
 * Fetch the current download list.
 *
 * @param params - Optional filters (package/link UUIDs, pagination)
 * @returns Array of download links with status, progress and speed information
 */
export async function queryLinks(params?: QueryLinksParams): Promise<DownloadLink[]> {
  const links = await jdCall<Parameters<typeof normalizeLink>[0][]>('/downloadsV2/queryLinks', {
    ...LINK_FIELDS,
    ...params,
  })
  return links.map(normalizeLink)
}

/** A download package as returned by `/downloadsV2/queryPackages`. */
export interface PackageInfo {
  /** Unique identifier of this package. */
  uuid: number
  /** Package name. */
  name: string
  /** Folder the package is saved to, as seen by JD2 (e.g. `/output/movies/Dune`). */
  saveTo: string
  /** Comment attached to the package (jdownloader-mover writes its errors here). */
  comment: string | null
}

/**
 * Fetch name, save folder and comment of every download package.
 *
 * @returns Array of packages
 */
export async function queryPackages(): Promise<PackageInfo[]> {
  const packages = await jdCall<(Partial<PackageInfo> & Pick<PackageInfo, 'uuid' | 'name'>)[]>(
    '/downloadsV2/queryPackages',
    { saveTo: true, comment: true },
  )
  return packages.map(p => ({ saveTo: '', comment: null, ...p }))
}

/**
 * Enable or disable (pause/resume) a set of download links.
 *
 * @param linkIds - UUIDs of the links to modify
 * @param enabled - `true` to resume, `false` to pause
 */
export function setEnabled(linkIds: number[], enabled: boolean): Promise<void> {
  return jdCall('/downloadsV2/setEnabled', enabled, linkIds, [])
}

/**
 * Permanently remove download links from the list.
 *
 * @param linkIds - UUIDs of the links to remove
 */
export function removeLinks(linkIds: number[]): Promise<void> {
  return jdCall('/downloadsV2/removeLinks', linkIds, [])
}

/**
 * Force-start a set of download links regardless of queue position or slot limits.
 *
 * @param linkIds - UUIDs of the links to force-start
 */
export function forceDownload(linkIds: number[]): Promise<void> {
  return jdCall('/downloadsV2/forceDownload', linkIds, [])
}

/**
 * Remove finished links from the download list (files on disk are kept).
 *
 * When called without arguments all finished links are removed.
 *
 * @param linkIds - Optional subset of link UUIDs to clean up
 */
export function cleanup(linkIds?: number[]): Promise<void> {
  return jdCall(
    '/downloadsV2/cleanup',
    linkIds ?? [],
    [],
    'DELETE_FINISHED',
    'REMOVE_LINKS_ONLY',
    linkIds ? 'SELECTED' : 'ALL',
  )
}
