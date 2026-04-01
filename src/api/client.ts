const BASE_URL = import.meta.env.VITE_JD_API_URL ?? 'http://localhost:3128'

export async function jdFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`JD API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}
