export type EntryType = 'DIRECTORY' | 'FILE'

export interface BrowseResult {
  resolvedPath: string
  parentPath: string
  entries: FilesystemEntry[]
}

export interface FilesystemEntry {
  name: string
  path: string
  type: EntryType
  projectRoot: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  type: EntryType
  projectRoot?: boolean
  children?: FileTreeNode[]
  adapterNames?: string[]
}
