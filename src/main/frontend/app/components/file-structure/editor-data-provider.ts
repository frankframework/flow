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
    void this.fetchAndBuildTree()
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

      this.data['root'] = {
        index: 'root',
        data: { name: tree.name, path: tree.path, projectRoot: true },
        isFolder: true,
        children: [],
      }

      this.data['root'].children = this.buildChildren('root', tree.children)
      this.loadedDirectories.add(tree.path)
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
        return
      }

      item.children = this.buildChildren(itemId, directory.children)
      this.loadedDirectories.add(item.data.path)
      this.notifyListeners([itemId])
    } catch (error) {
      console.error('Failed to load directory', error)
    }
  }

  private buildChildren(parentIndex: TreeItemIndex, children?: FileTreeNode[]): TreeItemIndex[] {
    const sorted = sortChildren(children)
    const childIds: TreeItemIndex[] = []

    for (const child of sorted) {
      const childIndex = `${parentIndex}/${child.name}`

      this.data[childIndex] = {
        index: childIndex,
        data: { name: child.name, path: child.path },
        isFolder: child.type === 'DIRECTORY',
        children: child.type === 'DIRECTORY' ? [] : undefined,
      }

      childIds.push(childIndex)
    }

    return childIds
  }

  public async reloadDirectory(itemId: TreeItemIndex): Promise<void> {
    const item = this.data[itemId]
    if (!item || !item.isFolder) return

    this.loadedDirectories.delete(item.data.path)
    this.removeSubtree(itemId)
    item.children = []
    await this.loadDirectory(itemId)
  }

  private removeSubtree(parentId: TreeItemIndex): void {
    const item = this.data[parentId]
    if (!item?.children) return

    for (const childId of item.children) {
      this.removeSubtree(childId)
      const child = this.data[childId]
      if (child?.isFolder && child.data?.path) {
        this.loadedDirectories.delete(child.data.path)
      }
      delete this.data[childId]
    }
  }

  public getItemByPath(path: string): TreeItem<FileNode> | undefined {
    return Object.values(this.data).find((item) => item.data.path === path)
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
