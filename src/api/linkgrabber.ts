import { jdFetch } from './client'

/** Availability status of a link in the grabber queue. */
export type LinkAvailability = 'ONLINE' | 'OFFLINE' | 'TEMP_UNKNOWN' | 'UNKNOWN'

/** A single link inside the Link Grabber queue. */
export interface GrabberLink {
  /** Unique identifier of this link. */
  uuid: number
  /** Display name of the file. */
  name: string
  /** Original URL submitted to the grabber. */
  url: string
  /** Total file size in bytes (`-1` if unknown). */
  bytesTotal: number
  /** Hosting domain (e.g. `mediafire.com`). */
  host: string
  /** Online availability of the link. */
  availability: LinkAvailability
  /** UUID of the grabber package this link belongs to. */
  packageUUID: number
  /** Comment attached to the link, if any. */
  comment: string | null
}

/** Query parameters accepted by `/linkgrabberv2/queryLinks`. */
export interface QueryGrabberLinksParams {
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
 * Fetch the current Link Grabber queue.
 *
 * @param params - Optional filters (package/link UUIDs, pagination)
 * @returns Array of grabber links pending confirmation
 */
export function queryGrabberLinks(params?: QueryGrabberLinksParams): Promise<GrabberLink[]> {
  return jdFetch<GrabberLink[]>('/linkgrabberv2/queryLinks', {
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  })
}

/**
 * Submit one or more URLs to the Link Grabber for processing.
 *
 * @param urls - List of URLs to add
 * @param packageName - Optional package name to group the links under
 * @param destinationFolder - Optional download path override
 */
export function addLinks(urls: string[], packageName?: string, destinationFolder?: string): Promise<void> {
  return jdFetch('/linkgrabberv2/addLinks', {
    method: 'POST',
    body: JSON.stringify({
      links: urls.join('\n'),
      ...(packageName ? { packageName } : {}),
      ...(destinationFolder ? { destinationFolder } : {}),
    }),
  })
}

/**
 * Move a set of grabber links to the download queue.
 *
 * @param linkIds - UUIDs of the grabber links to confirm
 */
export function confirmLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/linkgrabberv2/confirmLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

/**
 * Remove links from the Link Grabber without adding them to the download queue.
 *
 * @param linkIds - UUIDs of the grabber links to remove
 */
export function removeGrabberLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/linkgrabberv2/removeLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}
