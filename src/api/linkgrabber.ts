import { jdFetch } from './client'

export interface GrabberLink {
  uuid: number
  name: string
  url: string
  packageUUID: number
}

export function queryGrabberLinks(): Promise<GrabberLink[]> {
  return jdFetch<GrabberLink[]>('/linkgrabberv2/queryLinks')
}

export function addLinks(urls: string[]): Promise<void> {
  return jdFetch('/linkgrabberv2/addLinks', {
    method: 'POST',
    body: JSON.stringify({ links: urls.join('\n') }),
  })
}

export function confirmLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/linkgrabberv2/confirmLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

export function removeGrabberLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/linkgrabberv2/removeLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}
