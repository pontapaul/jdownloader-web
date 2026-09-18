import { ref, computed, watch } from 'vue'
import { listLibraryFolders } from '@/api/library'

/** Where a download ends up once jdownloader-mover has moved it. */
export type DestinationKind = 'movies' | 'shows' | 'downloads'

/** Staging folder as seen by JD2; the mover maps `<STAGING>/<kind>/…` to the library. */
const STAGING = '/output'

/** Arguments for `linkgrabberv2/addLinks`: JD2 saves to `destinationFolder/packageName`. */
export interface Destination {
  destinationFolder: string
  packageName?: string
  /** Human-readable target, e.g. `Serie TV / Arcane / Stagione 2`. */
  label: string
}

const KIND_LABELS: Record<DestinationKind, string> = {
  movies: 'Film',
  shows: 'Serie TV',
  downloads: 'Download',
}

/**
 * Describe where a package saved in `saveTo` will be moved, e.g.
 * `/output/shows/Arcane/Stagione 2` → `Serie TV / Arcane / Stagione 2`.
 *
 * @returns The description, or `null` if the mover does not handle that folder
 */
export function describeSaveTo(saveTo: string): string | null {
  if (!saveTo.startsWith(`${STAGING}/`)) return null
  const [kind, ...rest] = saveTo.slice(STAGING.length + 1).split('/').filter(Boolean)
  if (!kind || !(kind in KIND_LABELS)) return null
  return [KIND_LABELS[kind as DestinationKind], ...rest].join(' / ')
}

/** Make a name safe as a single folder name (and stable under JD2's package name rules). */
function sanitize(name: string): string {
  return name
    .replace(/[/\\]/g, '-')
    .replace(/:/g, ' -')
    .replace(/[*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
}

/**
 * State and logic of the destination picker: movie title, or show + season, or
 * a plain download with an optional package name.
 */
export function useDestination() {
  const kind = ref<DestinationKind>('movies')
  const title = ref('')
  const show = ref('')
  const season = ref(1)
  const packageName = ref('')

  const movies = ref<string[]>([])
  const shows = ref<string[]>([])

  /** Load existing folders, used as suggestions. */
  async function loadLibrary(): Promise<void> {
    ;[movies.value, shows.value] = await Promise.all([
      listLibraryFolders('movies'),
      listLibraryFolders('shows'),
    ])
  }

  // Existing show: suggest its latest season
  watch(show, async name => {
    if (!shows.value.includes(name)) return
    const seasons = (await listLibraryFolders('shows', name))
      .map(f => /^Stagione (\d+)$/.exec(f)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number)
    if (seasons.length && show.value === name) season.value = Math.max(...seasons)
  })

  const destination = computed<Destination | null>(() => {
    if (kind.value === 'movies') {
      const name = sanitize(title.value)
      if (!name) return null
      return {
        destinationFolder: `${STAGING}/movies`,
        packageName: name,
        label: `${KIND_LABELS.movies} / ${name}`,
      }
    }
    if (kind.value === 'shows') {
      const name = sanitize(show.value)
      if (!name || !Number.isInteger(season.value) || season.value < 0) return null
      const seasonFolder = `Stagione ${season.value}`
      return {
        destinationFolder: `${STAGING}/shows/${name}`,
        packageName: seasonFolder,
        label: `${KIND_LABELS.shows} / ${name} / ${seasonFolder}`,
      }
    }
    const name = sanitize(packageName.value)
    return {
      destinationFolder: `${STAGING}/downloads`,
      packageName: name || undefined,
      label: `${KIND_LABELS.downloads} / ${name || 'nome automatico'}`,
    }
  })

  function reset(): void {
    title.value = ''
    show.value = ''
    season.value = 1
    packageName.value = ''
  }

  return { kind, title, show, season, packageName, movies, shows, loadLibrary, destination, reset }
}
