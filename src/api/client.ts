let BASE_URL: string = import.meta.env.VITE_JD_API_URL ?? 'http://localhost:3128'

/** Update the API base URL at runtime (called when the user saves settings). */
export function setApiBaseUrl(url: string): void {
  BASE_URL = url
}

/** Thrown when the server returns a non-2xx HTTP response. */
export class JdApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`JD API error: ${status} ${statusText}`)
    this.name = 'JdApiError'
  }
}

/** Thrown when the network is unavailable or JD2 is unreachable. */
export class JdOfflineError extends Error {
  constructor(cause?: unknown) {
    super('JD2 non raggiungibile')
    this.name = 'JdOfflineError'
    this.cause = cause
  }
}

/**
 * Base fetch wrapper for the JDownloader Deprecated API.
 *
 * Reads the API base URL from the `VITE_JD_API_URL` environment variable,
 * falling back to `http://localhost:3128`.
 *
 * @param path - Endpoint path (e.g. `/jd/version`)
 * @param options - Optional `fetch` init options (method, body, …)
 * @returns Parsed JSON response typed as `T`
 * @throws {JdOfflineError} When the network request fails (host unreachable, CORS, …)
 * @throws {JdApiError} When the server returns a non-2xx status code
 */
export async function jdFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err) {
    throw new JdOfflineError(err)
  }
  if (!response.ok) {
    throw new JdApiError(response.status, response.statusText)
  }
  return response.json() as Promise<T>
}

/** JD2 version information returned by `/jd/version`. */
export interface JdVersion {
  /** JDownloader2 build number. */
  version: number
}

/**
 * Fetch the JDownloader2 version.
 *
 * Useful as a lightweight connectivity / health check — if this call succeeds,
 * the Deprecated API is reachable.
 *
 * @returns JD2 version object
 */
export function getJdVersion(): Promise<JdVersion> {
  return jdFetch<JdVersion>('/jd/version')
}
