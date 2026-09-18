let BASE_URL: string = import.meta.env.VITE_JD_API_URL ?? 'http://localhost:3128'

/** Update the API base URL at runtime (called when the user saves settings). */
export function setApiBaseUrl(url: string): void {
  BASE_URL = url
}

/** Error body returned by JD2 on failure (e.g. `{"src":"DEVICE","type":"BAD_PARAMETERS"}`). */
interface JdErrorBody {
  src?: string
  type?: string
  data?: unknown
}

/** Thrown when the server returns a non-2xx HTTP response. */
export class JdApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    /** JD2 error type (e.g. `BAD_PARAMETERS`), when the body carries one. */
    public readonly type?: string,
  ) {
    super(`JD API error: ${status} ${type ?? statusText}`)
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
 * Call a JDownloader Deprecated API method.
 *
 * JD2 takes the method arguments positionally, in the order given by its
 * documentation (`GET <base>/help`), as `POST {"params": [...]}`, and wraps
 * the result as `{"data": ...}`.
 *
 * @param path - Method path (e.g. `/accountsV2/addAccount`)
 * @param params - Method arguments, in the documented order
 * @returns The unwrapped `data` field of the response, typed as `T`
 * @throws {JdOfflineError} When the network request fails (host unreachable, CORS, …)
 * @throws {JdApiError} When the server returns a non-2xx status code
 */
export async function jdCall<T>(path: string, ...params: unknown[]): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    })
  } catch (err) {
    throw new JdOfflineError(err)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as JdErrorBody | null
    throw new JdApiError(response.status, response.statusText, body?.type)
  }
  const body = (await response.json()) as { data: T }
  return body.data
}

/**
 * Fetch the JDownloader2 build number.
 *
 * Useful as a lightweight connectivity / health check — if this call succeeds,
 * the Deprecated API is reachable.
 *
 * @returns JD2 build number
 */
export function getJdVersion(): Promise<number> {
  return jdCall<number>('/jd/version')
}
