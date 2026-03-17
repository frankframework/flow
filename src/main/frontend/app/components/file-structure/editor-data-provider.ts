import type { TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { FileIndexEntry, FileTreeNode } from '~/types/filesystem.types'
import { fetchProjectRootTree, fetchDirectoryByPath, fetchProjectTreeIndex } from '~/services/file-tree-service'
import { sortChildren } from './tree-utilities'
import type { DataProviderLike } from './use-file-tree-context-menu'
import { BaseFilesDataProvider } from './base-files-data-provider'

export interface FileNode {
  name: string
  path: string
  projectRoot?: boolean
}

export default class EditorFilesDataProvider extends BaseFilesDataProvider<FileNode> implements DataProviderLike {
  private readonly projectName: string
  fileIndex: FileIndexEntry[] = []
  projectRootPath = ''

  constructor(projectName: string) {
    super()
    this.projectName = projectName
  }

  private expandedItems: string[] = []

  public async init(expandedItems: string[] = []) {
    this.expandedItems = expandedItems
    await this.fetchAndBuildTree()
    await this.preloadExpandedItems()
  }

  private async preloadExpandedItems() {
    const sortedIds = [...this.expandedItems].toSorted((a, b) => a.split('/').length - b.split('/').length)
    for (const id of sortedIds) {
      if (id === 'root') continue
      const item = this.data[id]
      if (!item || !item.isFolder) continue
      await this.loadDirectory(id)
    }
  }

  public override async reloadDirectory(_itemId: TreeItemIndex): Promise<void> {
    this.data = {}
    this.loadedDirectories.clear()
    await this.fetchAndBuildTree()
    await this.preloadExpandedItems()
    this.notifyListeners(Object.keys(this.data))
  }

  private async fetchAndBuildTree() {
    try {
      if (!this.projectName) return

      const tree = await fetchProjectRootTree(this.projectName)
      const index = await fetchProjectTreeIndex(this.projectName)
      this.fileIndex = index

      this.projectRootPath = tree.path.replaceAll('\\', '/')
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
    const childIds: TreeItemIndex[] = []

    for (const child of sortChildren(children)) {
      const childIndex = `${parentIndex}/${child.name}`
      const isDirectory = child.type === 'DIRECTORY'

      this.data[childIndex] = {
        index: childIndex,
        data: { name: child.name, path: child.path },
        isFolder: isDirectory,
        children: isDirectory ? this.buildChildren(childIndex, child.children) : undefined,
      }

      if (isDirectory && child.children != null) {
        this.loadedDirectories.add(child.path)
      }

      childIds.push(childIndex)
    }

    return childIds
  }

  public override async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<FileNode>> {
    return (
      this.data[itemId] ?? {
        index: itemId,
        isFolder: false,
        data: { name: 'Unknown', path: '' },
        children: [],
      }
    )
  }

  public async onRenameItem(item: TreeItem, name: string): Promise<void> {
    if (this.data[item.index]) {
      this.data[item.index].data.name = name
    }
  }

  public isLoaded(itemId: string) {
    const item = this.data[itemId]
    return item?.isFolder && this.loadedDirectories.has(item.data.path)
  }
}
