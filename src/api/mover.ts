/**
 * jdownloader-mover's small HTTP API, proxied by nginx under `/mover/` (see nginx.conf).
 *
 * JD2's own `setDownloadDirectory` only records the new folder: the mover is the one
 * with the staging disk, so it renames the folder (pausing running downloads meanwhile)
 * and then tells JD2.
 */
const MOVER_URL = '/mover'

/**
 * Move a download package to another staging folder.
 *
 * @param uuid - Package UUID
 * @param directory - Exact new folder as seen by JD2 (e.g. `/output/movies/Dune`)
 * @throws {Error} With the mover's explanation when the move is refused or fails
 */
export async function movePackage(uuid: number, directory: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${MOVER_URL}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, directory }),
    })
  } catch (err) {
    throw new Error('jdownloader-mover non raggiungibile', { cause: err })
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `jdownloader-mover: errore ${response.status}`)
  }
}
