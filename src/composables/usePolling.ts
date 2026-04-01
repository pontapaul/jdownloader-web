import { onMounted, onUnmounted } from 'vue'

export function usePolling(fn: () => void, intervalMs: number) {
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
    if (timer) return
    fn()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') fn()
    }, intervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') {
      fn()
    }
  }

  onMounted(() => {
    start()
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  return { start, stop }
}
