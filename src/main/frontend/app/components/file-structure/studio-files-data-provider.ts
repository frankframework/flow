import type { TreeItemIndex } from 'react-complex-tree'
import { logApiError } from '~/utils/logger'
import { sortChildren, getAncestorIds } from './tree-utilities'
import { fetchProjectTree, fetchDirectoryByPath, fetchAncestorPath } from '~/services/file-tree-service'
import type { FileTreeNode } from '~/types/filesystem.types'
import { BaseFilesDataProvider } from './base-files-data-provider'

export interface StudioFolderData {
  name: string
  path: string
  adapterNames?: string[]
}
export interface StudioAdapterData {
  adapterName: string
  configPath: string
  adapterPosition: number
}
export type StudioItemData = string | StudioFolderData | StudioAdapterData

function isFolderData(data: StudioItemData): data is StudioFolderData {
  return typeof data === 'object' && 'path' in data
}

export default class StudioFilesDataProvider extends BaseFilesDataProvider<StudioItemData> {
  private readonly projectName: string
  private rootPath = ''

  constructor(projectName: string) {
    super()
    this.projectName = projectName
  }

  public getRootPath(): string {
    return this.rootPath
  }

  public async init(expandedItems: string[] = []) {
    await this.loadRoot()

    const sortedIds = [...expandedItems].toSorted((a, b) => a.split('/').length - b.split('/').length)
    for (const id of sortedIds) {
      if (id === 'root') continue

      const item = this.data[id]
      if (!item || !item.isFolder) continue

      if (isFolderData(item.data) && item.data.path.endsWith('.xml')) {
        this.loadAdapters(id)
      } else {
        await this.loadDirectory(id)
      }
    }
  }

  public override async reloadDirectory(_itemId: TreeItemIndex): Promise<void> {
    this.data = {}
    this.loadedDirectories.clear()
    await this.loadRoot()
    this.notifyListeners(Object.keys(this.data))
  }

  private async loadRoot() {
    const tree = await fetchProjectTree(this.projectName)

    if (!tree) {
      console.warn('Received empty tree from API')
      this.data = {}
      return
    }

    this.rootPath = tree.path

    this.data['root'] = {
      index: 'root',
      data: 'Configurations',
      children: [],
      isFolder: true,
    }

    for (const child of sortChildren(tree.children)) {
      const index = this.buildChildItem('root', child)
      this.data['root'].children!.push(index)
    }

    this.loadedDirectories.add(tree.path)
    this.notifyListeners(['root'])
  }

  public async loadDirectory(itemId: TreeItemIndex) {
    const item = this.data[itemId]
    if (!item || !item.isFolder || !isFolderData(item.data)) return
    if (this.loadedDirectories.has(item.data.path)) return

    const { path } = item.data
    try {
      if (!item.children) item.children = []

      const directory = await fetchDirectoryByPath(this.projectName, path)
      if (!directory) {
        console.warn('Received empty directory from API')
        return
      }

      item.children = sortChildren(directory.children).map((child) => this.buildChildItem(itemId, child))
      this.loadedDirectories.add(path)
      this.notifyListeners([itemId])
    } catch (error) {
      logApiError(`Failed to load directory for ${path}`, error as Error)
    }
  }

  public loadAdapters(itemId: TreeItemIndex) {
    const item = this.data[itemId]
    if (!item || !item.isFolder || !isFolderData(item.data)) return
    if (this.loadedDirectories.has(item.data.path)) return

    const { path, adapterNames = [] } = item.data

    for (const [i, adapterName] of adapterNames.entries()) {
      const adapterIndex = `${itemId}/${adapterName}::${i}`
      this.data[adapterIndex] = {
        index: adapterIndex,
        data: { adapterName, configPath: path, adapterPosition: i },
        isFolder: false,
      }
      item.children!.push(adapterIndex)
    }

    this.loadedDirectories.add(path)
    this.notifyListeners([itemId])
  }

  public async loadAncestorDirectories(itemId: TreeItemIndex) {
    const ancestorIds = getAncestorIds(itemId as string)
    const deepestAncestorId = ancestorIds.at(-1)
    if (!deepestAncestorId || deepestAncestorId === 'root') return

    const ancestorItem = this.data[deepestAncestorId]
    if (!ancestorItem || !isFolderData(ancestorItem.data)) return

    const { path } = ancestorItem.data
    try {
      const ancestorTree = await fetchAncestorPath(this.projectName, path)
      const changedIds: TreeItemIndex[] = []
      this.applyAncestorTree(ancestorTree, 'root', changedIds)
      if (changedIds.length > 0) this.notifyListeners(changedIds)
    } catch (error) {
      console.error(`Failed to load ancestor directories for ${path}`, error)
    }
  }

  private applyAncestorTree(node: FileTreeNode, itemId: TreeItemIndex, changedIds: TreeItemIndex[]) {
    const item = this.data[itemId]
    if (!item?.isFolder) return

    const childOnPath = node.children?.find((child) => child.children != null)

    if (isFolderData(item.data) && !this.loadedDirectories.has(node.path)) {
      item.children = sortChildren(node.children ?? []).map((child) => this.buildChildItem(itemId, child))
      this.loadedDirectories.add(node.path)
      changedIds.push(itemId)
    }

    if (childOnPath) {
      const childItemId = `${itemId}/${childOnPath.name}`
      this.applyAncestorTree(childOnPath, childItemId, changedIds)
    }
  }

  private buildChildItem(parentId: TreeItemIndex, child: FileTreeNode): TreeItemIndex {
    const index = `${parentId}/${child.name}`
    const isFolder = child.type === 'DIRECTORY' || child.name.endsWith('.xml')

    this.data[index] = {
      index,
      data: {
        name: isFolder ? child.name.replace(/\.xml$/, '') : child.name,
        path: child.path,
        adapterNames: child.adapterNames,
      },
      isFolder,
      children: isFolder ? [] : undefined,
    }

    if (isFolder && child.name.endsWith('.xml') && child.adapterNames?.length) {
      for (const [i, adapterName] of child.adapterNames.entries()) {
        const adapterIndex = `${index}/${adapterName}::${i}`
        this.data[adapterIndex] = {
          index: adapterIndex,
          data: { adapterName, configPath: child.path, adapterPosition: i },
          isFolder: false,
        }
        this.data[index].children!.push(adapterIndex)
      }
      this.loadedDirectories.add(child.path)
    } else if (child.type === 'DIRECTORY' && child.children != null) {
      for (const subChild of sortChildren(child.children)) {
        this.data[index].children!.push(this.buildChildItem(index, subChild))
      }
      this.loadedDirectories.add(child.path)
    }

    return index
  }
}
