import type { TreeItemIndex } from 'react-complex-tree'
import { sortChildren } from './tree-utilities'
import { fetchProjectTree, fetchDirectoryByPath } from '~/services/file-tree-service'
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

export default class FilesDataProvider extends BaseFilesDataProvider<StudioItemData> {
  private readonly projectName: string

  constructor(projectName: string) {
    super()
    this.projectName = projectName
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

  private async loadRoot() {
    const tree = await fetchProjectTree(this.projectName)

    if (!tree) {
      console.warn('[StudioFilesDataProvider] Received empty tree from API')
      this.data = {}
      return
    }

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
        console.warn('[StudioFilesDataProvider] Received empty directory from API')
        return
      }

      item.children = sortChildren(directory.children).map((child) => this.buildChildItem(itemId, child))
      this.loadedDirectories.add(path)
      this.notifyListeners([itemId])
    } catch (error) {
      console.error(`Failed to load directory for ${path}`, error)
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

    return index
  }
}
