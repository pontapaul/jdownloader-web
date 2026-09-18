import { jdCall } from './client'

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

/** Fields requested from `/linkgrabberv2/queryLinks` (JD2 returns only what is asked for). */
const GRABBER_LINK_FIELDS = {
  availability: true,
  bytesTotal: true,
  comment: true,
  host: true,
  url: true,
}

/** JD2 omits fields without a value: fill them in so every link has the full shape. */
function normalizeGrabberLink(raw: Partial<GrabberLink> & Pick<GrabberLink, 'uuid' | 'name' | 'packageUUID'>): GrabberLink {
  return {
    url: '',
    bytesTotal: -1,
    host: '',
    availability: 'UNKNOWN',
    comment: null,
    ...raw,
  }
}

/**
 * Fetch the current Link Grabber queue.
 *
 * @param params - Optional filters (package/link UUIDs, pagination)
 * @returns Array of grabber links pending confirmation
 */
export async function queryGrabberLinks(params?: QueryGrabberLinksParams): Promise<GrabberLink[]> {
  const links = await jdCall<Parameters<typeof normalizeGrabberLink>[0][]>('/linkgrabberv2/queryLinks', {
    ...GRABBER_LINK_FIELDS,
    ...params,
  })
  return links.map(normalizeGrabberLink)
}

/** Progress of a link crawler job, as returned by `/linkgrabberv2/queryLinkCrawlerJobs`. */
export interface CrawlerJob {
  /** Links still being crawled. */
  crawling: boolean
  /** Links still being checked for availability. */
  checking: boolean
  /** Links sent to the Link Grabber. */
  crawled: number
  /** Links no plugin can handle (not a supported hoster or file URL). */
  unhandled: number
  /** Links dropped by a filter rule. */
  filtered: number
  /** Links whose crawl failed. */
  broken: number
}

/** Options for {@link addLinks}. */
export interface AddLinksOptions {
  /** Package name; JD2 saves to `destinationFolder/packageName`. */
  packageName?: string
  /** Download folder (JD2 path). */
  destinationFolder?: string
  /** Password of the archives in these links. */
  extractPassword?: string
}

/**
 * Submit one or more URLs to the Link Grabber for processing.
 *
 * @param urls - List of URLs to add
 * @param options - Package name, destination folder, archive password
 * @returns ID of the crawler job, to follow it with {@link queryCrawlerJob}
 */
export async function addLinks(urls: string[], options: AddLinksOptions = {}): Promise<number> {
  const job = await jdCall<{ id: number }>('/linkgrabberv2/addLinks', {
    links: urls.join('\n'),
    ...Object.fromEntries(Object.entries(options).filter(([, value]) => value)),
  })
  return job.id
}

/**
 * Fetch the progress of a crawler job.
 *
 * @param jobId - ID returned by {@link addLinks}
 * @returns The job, or `null` if JD2 no longer knows it
 */
export async function queryCrawlerJob(jobId: number): Promise<CrawlerJob | null> {
  const jobs = await jdCall<Partial<CrawlerJob>[]>('/linkgrabberv2/queryLinkCrawlerJobs', {
    collectorInfo: true,
    jobIds: [jobId],
  })
  const job = jobs[0]
  if (!job) return null
  // JD2 omits false and zero values
  return { crawling: false, checking: false, crawled: 0, unhandled: 0, filtered: 0, broken: 0, ...job }
}

/**
 * Move a set of grabber links to the download queue.
 *
 * @param linkIds - UUIDs of the grabber links to confirm
 */
export function confirmLinks(linkIds: number[]): Promise<void> {
  return jdCall('/linkgrabberv2/moveToDownloadlist', linkIds, [])
}

/**
 * Remove links from the Link Grabber without adding them to the download queue.
 *
 * @param linkIds - UUIDs of the grabber links to remove
 */
export function removeGrabberLinks(linkIds: number[]): Promise<void> {
  return jdCall('/linkgrabberv2/removeLinks', linkIds, [])
}
