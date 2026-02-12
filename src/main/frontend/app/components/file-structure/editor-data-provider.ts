import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import { fetchDirectoryByPath, fetchProjectRootTree } from '~/services/project-service'
import { sortChildren } from './tree-utilities'

export interface FileNode {
  name: string
  path: string
  projectRoot?: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'FILE' | 'DIRECTORY'
  projectRoot?: boolean
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
    await this.fetchAndBuildTree()
  }

  /** Fetch file tree from backend and build the provider's data */
  private async fetchAndBuildTree() {
    try {
      if (!this.projectName) return

      const tree = await fetchProjectRootTree(this.projectName)

      if (!tree) {
        console.warn('[EditorFilesDataProvider] Received empty tree from API')
        this.data = {}
        return
      }

      this.buildTreeFromFileTree(tree)
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
      const directory = await fetchDirectoryByPath(this.projectName, item.data.path)
      if (!directory) {
        console.warn('[EditorFilesDataProvider] Received empty directory from API')
        this.data = {}
        return
      }

      const sortedChildren = sortChildren(directory.children)

      const children: TreeItemIndex[] = []

      for (const child of sortedChildren) {
        const childIndex = `${itemId}/${child.name}`

        this.data[childIndex] = {
          index: childIndex,
          data: { name: child.name, path: child.path, projectRoot: node.projectRoot },
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
