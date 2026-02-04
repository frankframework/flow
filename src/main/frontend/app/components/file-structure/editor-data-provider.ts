import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import { fetchProjectTree } from '~/services/project-service'
import { sortChildren } from './tree-utilities'

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
  }

  /**
   * Public method to initialize data loading.
   * Call this from your React component's useEffect.
   */
  public async loadData(): Promise<void> {
    await this.loadRoot()
  }

  /** Fetch file tree from backend and build the provider's data */
  private async loadRoot() {
    try {
      if (!this.projectName) return

      const tree = await fetchProjectTree(this.projectName)

      if (!root) {
        console.warn('[EditorFilesDataProvider] Received empty tree from API')
        this.data = {}
        return
      }

      this.data['root'] = {
        index: 'root',
        data: { name: root.name, path: root.path },
        isFolder: true,
        children: [],
      }

      // Sort directories first, then files, both alphabetically
      const sortedChildren = sortChildren(root.children)

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
      console.error('[EditorFilesDataProvider] Unexpected error loading tree:', error)
      this.data = {}
      this.notifyListeners(['root'])
    }
  }

  public async loadDirectory(itemId: TreeItemIndex): Promise<void> {
    const item = this.data[itemId]
    if (!item || !item.isFolder) return
    if (this.loadedDirectories.has(item.data.path)) return

    try {
      const response = await fetch(apiUrl(`/projects/${this.projectName}?path=${encodeURIComponent(item.data.path)}`))
      if (!response.ok) throw new Error('Failed to fetch directory')

      const dir: FileTreeNode = await response.json()

      const sortedChildren = sortChildren(dir.children)

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
    const item = this.data[itemId]
    if (!item) {
      return {
        index: itemId,
        isFolder: false,
        data: { name: 'Unknown', path: '' },
        children: [],
      }
    }
    return item
  }

  public async onChangeItemChildren(itemId: TreeItemIndex, newChildren: TreeItemIndex[]) {
    if (this.data[itemId]) {
      this.data[itemId].children = newChildren
      this.notifyListeners([itemId])
    }
  }

  public onDidChangeTreeData(listener: (changedItemIds: TreeItemIndex[]) => void): Disposable {
    this.treeChangeListeners.push(listener)
    return {
      dispose: () => {
        const index = this.treeChangeListeners.indexOf(listener)
        if (index !== -1) {
          this.treeChangeListeners.splice(index, 1)
        }
      },
    }
  }

  public async onRenameItem(item: TreeItem, name: string): Promise<void> {
    if (this.data[item.index]) {
      this.data[item.index].data.name = name
    }
  }

  /** Notify all listeners that certain nodes changed */
  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
