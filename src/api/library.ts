/** Library roots exposed read-only by nginx under `/library/` (see nginx.conf). */
export type LibraryRoot = 'movies' | 'shows'

/** One entry of an nginx `autoindex_format json` listing. */
interface AutoindexEntry {
  name: string
  type: 'directory' | 'file' | 'other'
}

/**
 * List the sub-folder names of a library folder.
 *
 * @param root - Library root (`movies` or `shows`)
 * @param path - Optional folder below the root (e.g. a show name)
 * @returns Folder names sorted alphabetically; empty when the library is not
 *   reachable (e.g. `npm run dev` without the nginx container)
 */
export async function listLibraryFolders(root: LibraryRoot, path = ''): Promise<string[]> {
  const segments = [root, ...(path ? [path] : [])].map(encodeURIComponent)
  try {
    const response = await fetch(`/library/${segments.join('/')}/`)
    if (!response.ok) return []
    const entries = (await response.json()) as AutoindexEntry[]
    return entries
      .filter(e => e.type === 'directory')
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, 'it'))
  } catch {
    return []
  }
}
