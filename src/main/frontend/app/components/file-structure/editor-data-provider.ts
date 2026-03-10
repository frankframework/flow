import type { TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { FileTreeNode } from '~/types/filesystem.types'
import { fetchDirectoryByPath, fetchProjectRootTree } from '~/services/project-service'
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

  constructor(projectName: string) {
    super()
    this.projectName = projectName
  }

  public async init(_expandedItems: string[] = []) {
    await this.fetchAndBuildTree()
  }

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

      if (isDirectory) {
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
}
