import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

export interface FileNode {
  name: string
  path: string
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'FILE' | 'DIRECTORY'
  children?: FileTreeNode[]
}

export default class EditorFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem<FileNode>> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private readonly projectName: string
  private loadedDirectories = new Set<string>()

  constructor(projectName: string) {
    this.projectName = projectName
    this.loadRoot()
  }

  private async loadRoot() {
    try {
      const response = await fetch(`/api/projects/${this.projectName}/tree`)
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)

      const root: FileTreeNode = await response.json()

      this.data['root'] = {
        index: 'root',
        data: { name: root.name, path: root.path },
        isFolder: true,
        children: [],
      }

      // Sort directories first, then files, both alphabetically
      const sortedChildren = (root.children ?? []).toSorted((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'DIRECTORY' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      for (const child of sortedChildren) {
        const childIndex = `root/${child.name}`

        this.data[childIndex] = {
          index: childIndex,
          data: { name: child.name, path: child.path },
          isFolder: child.type === 'DIRECTORY',
          children: child.type === 'DIRECTORY' ? [] : undefined,
        }

        this.data['root'].children!.push(childIndex)
      }

      this.loadedDirectories.add(root.path)
      this.notifyListeners(['root'])
    } catch (error) {
      console.error('Failed to load root directory', error)
    }
  }

  public async loadDirectory(itemId: TreeItemIndex): Promise<void> {
    const item = this.data[itemId]
    if (!item || !item.isFolder) return
    if (this.loadedDirectories.has(item.data.path)) return

    try {
      const response = await fetch(`/api/projects/${this.projectName}?path=${encodeURIComponent(item.data.path)}`)
      if (!response.ok) throw new Error('Failed to fetch directory')

      const dir: FileTreeNode = await response.json()

      const sortedChildren = (dir.children ?? []).toSorted((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'DIRECTORY' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      const children: TreeItemIndex[] = []

      for (const child of sortedChildren) {
        const childIndex = `${itemId}/${child.name}`

        this.data[childIndex] = {
          index: childIndex,
          data: { name: child.name, path: child.path },
          isFolder: child.type === 'DIRECTORY',
          children: child.type === 'DIRECTORY' ? [] : undefined,
        }

        children.push(childIndex)
      }

      item.children = children

      this.loadedDirectories.add(item.data.path)
      this.notifyListeners([itemId])
    } catch (error) {
      console.error('Failed to load directory', error)
    }
  }

  public async getAllItems(): Promise<TreeItem<FileNode>[]> {
    return Object.values(this.data)
  }

  public async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<FileNode>> {
    return this.data[itemId]
  }

  public async onChangeItemChildren(itemId: TreeItemIndex, newChildren: TreeItemIndex[]) {
    this.data[itemId].children = newChildren
    this.notifyListeners([itemId])
  }

  public onDidChangeTreeData(listener: (changedItemIds: TreeItemIndex[]) => void): Disposable {
    this.treeChangeListeners.push(listener)
    return {
      dispose: () => {
        this.treeChangeListeners.splice(this.treeChangeListeners.indexOf(listener), 1)
      },
    }
  }

  public async onRenameItem(item: TreeItem, name: string): Promise<void> {
    this.data[item.index].data.name = name
  }

  /** Notify all listeners that certain nodes changed */
  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
