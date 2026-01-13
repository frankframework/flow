import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { FileTreeNode } from './editor-data-provider'
import { getAdapterListenerType, getAdapterNamesFromConfiguration } from '~/routes/studio/xml-to-json-parser'
import { sortChildren } from './tree-utilities'

export default class FilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private projectName: string
  private loadedDirectories = new Set<string>()

  constructor(projectName: string) {
    this.projectName = projectName
    void this.loadRoot()
  }

  /** Update the tree using a backend fileTree */
  private async loadRoot() {
    const response = await fetch(`/api/projects/${this.projectName}/tree/configurations?shallow=true`)
    if (!response.ok) throw new Error(`Failed to fetch root: ${response.status}`)

    const root: FileTreeNode = await response.json()

    this.data['root'] = {
      index: 'root',
      data: 'Configurations',
      children: [],
      isFolder: true,
    }

    const sortedChildren = sortChildren(root.children)

    for (const child of sortedChildren) {
      const index = `root/${child.name}`

      this.data[index] = {
        index,
        data: {
          name: child.type === 'DIRECTORY' ? child.name : child.name.replace(/\.xml$/, ''),
          path: child.path,
        },
        children: child.type === 'DIRECTORY' || child.name.endsWith('.xml') ? [] : undefined,
        isFolder: true,
      }

      this.data['root'].children!.push(index)
    }

    this.loadedDirectories.add(root.path)
    this.notifyListeners(['root'])
  }

  public async loadDirectory(itemId: TreeItemIndex) {
    const item = this.data[itemId]
    if (!item || !item.isFolder || this.loadedDirectories.has(item.data.path)) return

    try {
      if (!item.children) item.children = []

      const response = await fetch(`/api/projects/${this.projectName}?path=${encodeURIComponent(item.data.path)}`)
      if (!response.ok) throw new Error('Failed to fetch directory')

      const dir: FileTreeNode = await response.json()

      const sortedChildren = sortChildren(dir.children)

      const children: TreeItemIndex[] = []

      for (const child of sortedChildren) {
        const childIndex = `${itemId}/${child.name}`
        const isFolder = child.type === 'DIRECTORY' || child.name.endsWith('.xml')

        this.data[childIndex] = {
          index: childIndex,
          data: {
            name: isFolder ? child.name.replace(/\.xml$/, '') : child.name,
            path: child.path,
          },
          isFolder,
          children: isFolder ? [] : undefined,
        }

        children.push(childIndex)
      }

      item.children = children
      this.loadedDirectories.add(item.data.path)
      this.notifyListeners([itemId])
    } catch (error) {
      console.error(`Failed to load directory for ${item.data.path}`, error)
    }
  }

  public async loadAdapters(itemId: TreeItemIndex) {
    const item = this.data[itemId]
    if (!item || !item.isFolder || this.loadedDirectories.has(item.data.path)) return

    try {
      const adapterNames = await getAdapterNamesFromConfiguration(this.projectName, item.data.path)

      for (const adapterName of adapterNames) {
        const adapterIndex = `${itemId}/${adapterName}`
        this.data[adapterIndex] = {
          index: adapterIndex,
          data: {
            adapterName,
            configPath: item.data.path,
            listenerName: await getAdapterListenerType(this.projectName, item.data.path, adapterName),
          },
          isFolder: false,
        }
        item.children!.push(adapterIndex)
      }

      this.loadedDirectories.add(item.data.path)
      this.notifyListeners([itemId])
    } catch (error) {
      console.error(`Failed to load adapters for ${item.data.path}`, error)
    }
  }

  public async getAllItems(): Promise<TreeItem[]> {
    return Object.values(this.data)
  }

  public async getTreeItem(itemId: TreeItemIndex) {
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

  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
