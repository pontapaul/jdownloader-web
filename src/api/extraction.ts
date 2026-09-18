import { jdCall } from './client'

const EXTRACTION_CONFIG = 'org.jdownloader.extensions.extraction.ExtractionConfig'
const EXTRACTION_STORAGE = 'cfg/org.jdownloader.extensions.extraction.ExtractionExtension'
const PASSWORD_DIALOG = 'org.jdownloader.extensions.extraction.ExtractPasswordDialogInterface'

/** A password request JD2 is waiting for (normally a dialog in its desktop GUI). */
export interface PasswordPrompt {
  /** Dialog ID, to answer it with {@link answerPasswordPrompt}. */
  id: number
  /** Name of the archive to extract. */
  archiveName: string
}

/**
 * Fetch the global archive password list: JD2 tries these on every archive and
 * adds the passwords that worked by itself.
 */
export function getPasswordList(): Promise<string[]> {
  return jdCall<string[] | null>('/config/get', EXTRACTION_CONFIG, EXTRACTION_STORAGE, 'PasswordList')
    .then(list => list ?? [])
}

/** Replace the global archive password list. */
export function setPasswordList(passwords: string[]): Promise<boolean> {
  return jdCall<boolean>('/config/set', EXTRACTION_CONFIG, EXTRACTION_STORAGE, 'PasswordList', passwords)
}

/**
 * Set the password of every archive in a package and extract it again.
 *
 * If the password is wrong JD2 asks for another one: see {@link listPasswordPrompts}.
 *
 * @param packageUuid - UUID of the download package
 * @param password - Password to try
 */
export async function retryExtraction(packageUuid: number, password: string): Promise<void> {
  const archives = await jdCall<{ archiveId: string }[]>('/extraction/getArchiveInfo', [], [packageUuid])
  for (const { archiveId } of archives) {
    await jdCall('/extraction/setArchiveSettings', archiveId, { archiveId, passwords: [password] })
  }
  await jdCall('/extraction/startExtractionNow', [], [packageUuid])
}

/** List the archive password requests JD2 is waiting for. */
export async function listPasswordPrompts(): Promise<PasswordPrompt[]> {
  const ids = (await jdCall<number[] | null>('/dialogs/list')) ?? []
  const prompts: PasswordPrompt[] = []
  for (const id of ids) {
    const dialog = await jdCall<{ type: string; properties?: Record<string, string> }>(
      '/dialogs/get',
      id,
      false,
      true,
    )
    if (dialog.type === PASSWORD_DIALOG) {
      prompts.push({ id, archiveName: dialog.properties?.archivename ?? '' })
    }
  }
  return prompts
}

/**
 * Answer a password request.
 *
 * @param id - Dialog ID
 * @param password - Password to try, or `null` to give up (the extraction fails)
 */
export function answerPasswordPrompt(id: number, password: string | null): Promise<void> {
  return jdCall(
    '/dialogs/answer',
    id,
    password === null ? { closereason: 'CANCEL' } : { closereason: 'OK', text: password },
  )
}
