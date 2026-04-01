import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  queryGrabberLinks,
  addLinks as apiAddLinks,
  confirmLinks as apiConfirmLinks,
  removeGrabberLinks,
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

  async function addLinks(urls: string[], packageName?: string, destinationFolder?: string): Promise<void> {
    await apiAddLinks(urls, packageName, destinationFolder)
    await fetchLinks()
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
