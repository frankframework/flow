export type EntryType = 'DIRECTORY' | 'FILE'

export type BrowseResult = {
  resolvedPath: string
  parentPath: string
  entries: FilesystemEntry[]
}

export type FilesystemEntry = {
  name: string
  path: string
  type: EntryType
  projectRoot: boolean
}

export type FileTreeNode = {
  name: string
  path: string
  type: EntryType
  projectRoot?: boolean
  children?: FileTreeNode[]
  adapterNames?: string[]
}
