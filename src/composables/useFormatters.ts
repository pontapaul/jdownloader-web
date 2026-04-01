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
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = seconds % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    const m = Math.ceil(seconds / 60)
    return `~${m}m`
  }

  return { formatSpeed, formatSize, formatEta }
}
