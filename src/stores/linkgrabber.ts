import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  queryGrabberLinks,
  addLinks as apiAddLinks,
  confirmLinks as apiConfirmLinks,
  removeGrabberLinks,
  queryCrawlerJob,
  type CrawlerJob,
  type GrabberLink,
} from '../api/linkgrabber'

export const useLinkGrabberStore = defineStore('linkgrabber', () => {
  const links = ref<GrabberLink[]>([])

  async function fetchLinks(): Promise<void> {
    try {
      links.value = await queryGrabberLinks()
    } catch {
      // Silently fail
    }
  }

  /**
   * Add links and wait until JD2 has crawled them.
   *
   * @returns The finished crawler job (how many links were handled), or `null`
   *   if JD2 forgot the job or it is still running after `timeoutMs`
   */
  async function addLinks(
    urls: string[],
    packageName?: string,
    destinationFolder?: string,
    timeoutMs = 60_000,
  ): Promise<CrawlerJob | null> {
    const jobId = await apiAddLinks(urls, packageName, destinationFolder)
    const deadline = Date.now() + timeoutMs
    let job: CrawlerJob | null = null
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      job = await queryCrawlerJob(jobId)
      if (!job || (!job.crawling && !job.checking)) break
    }
    await fetchLinks()
    return job && !job.crawling && !job.checking ? job : null
  }

  async function confirmLinks(linkIds: number[]): Promise<void> {
    await apiConfirmLinks(linkIds)
    await fetchLinks()
  }

  async function removeLinks(linkIds: number[]): Promise<void> {
    await removeGrabberLinks(linkIds)
    await fetchLinks()
  }

  return { links, fetchLinks, addLinks, confirmLinks, removeLinks }
})
