export function useFormatters() {
  function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec >= 1_048_576) return `${(bytesPerSec / 1_048_576).toFixed(1)} MB/s`
    if (bytesPerSec >= 1_024) return `${(bytesPerSec / 1_024).toFixed(0)} KB/s`
    return `${bytesPerSec} B/s`
  }

  function formatSize(bytes: number): string {
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
    if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`
    return `${bytes} B`
  }

  function formatEta(seconds: number): string {
    if (seconds <= 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return { formatSpeed, formatSize, formatEta }
}
