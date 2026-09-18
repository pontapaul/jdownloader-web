import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useExtractionStore } from './extraction'
import {
  queryGrabberLinks,
  addLinks as apiAddLinks,
  confirmLinks as apiConfirmLinks,
  removeGrabberLinks,
  queryCrawlerJob,
  jobPackages,
  setDownloadDirectory,
  type AddLinksOptions,
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
   * Add links and/or container files and wait until JD2 has crawled them.
   *
   * When both a destination folder and a package name are given, every package of
   * the job is then saved exactly to `destinationFolder/packageName`: containers
   * bring their own package names, and JD2 may split packages.
   *
   * @param onProgress - Called with the job state while JD2 analyzes the links
   * @returns The finished crawler job (how many links were handled), or `null`
   *   if JD2 forgot the job or it is still running after `timeoutMs`
   */
  async function addLinks(
    urls: string[],
    options: AddLinksOptions = {},
    onProgress?: (job: CrawlerJob) => void,
    timeoutMs = 60_000,
  ): Promise<CrawlerJob | null> {
    if (options.extractPassword) {
      await useExtractionStore().rememberPasswords([options.extractPassword])
    }
    const jobId = await apiAddLinks(urls, options)
    const deadline = Date.now() + timeoutMs
    let job: CrawlerJob | null = null
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      job = await queryCrawlerJob(jobId)
      if (job) onProgress?.(job)
      if (!job || (!job.crawling && !job.checking)) break
    }
    if (options.destinationFolder && options.packageName) {
      const packages = await jobPackages(jobId)
      if (packages.length) {
        await setDownloadDirectory(`${options.destinationFolder}/${options.packageName}`, packages)
      }
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
