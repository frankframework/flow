export type EntryType = 'DIRECTORY' | 'FILE'

export interface FilesystemEntry {
  name: string
  absolutePath: string
  type: EntryType
}
