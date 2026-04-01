import { jdFetch } from './client'

export interface DownloadLink {
  uuid: number
  name: string
  status: string
  bytesTotal: number
  bytesLoaded: number
  speed: number
  enabled: boolean
  packageUUID: number
}

export function queryLinks(): Promise<DownloadLink[]> {
  return jdFetch<DownloadLink[]>('/downloadsV2/queryLinks')
}

export function setEnabled(linkIds: number[], enabled: boolean): Promise<void> {
  return jdFetch('/downloadsV2/setEnabled', {
    method: 'POST',
    body: JSON.stringify({ linkIds, enabled }),
  })
}

export function removeLinks(linkIds: number[]): Promise<void> {
  return jdFetch('/downloadsV2/removeLinks', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

export function forcedDownload(linkIds: number[]): Promise<void> {
  return jdFetch('/downloadsV2/forcedDownload', {
    method: 'POST',
    body: JSON.stringify({ linkIds }),
  })
}

export function cleanup(): Promise<void> {
  return jdFetch('/downloadsV2/cleanup', { method: 'POST', body: JSON.stringify({}) })
}
