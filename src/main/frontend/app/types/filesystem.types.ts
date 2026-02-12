export type EntryType = 'DIRECTORY' | 'FILE'

export interface FilesystemEntry {
  name: string
  path: string
  type: EntryType
  projectRoot: boolean
}
