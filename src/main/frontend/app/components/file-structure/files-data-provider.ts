import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { FileTreeNode } from './editor-data-provider'
import { getAdapterListenerType, getAdapterNamesFromConfiguration } from '~/routes/studio/xml-to-json-parser'

export default class FilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private readonly projectName: string

  constructor(projectName: string, fileTree?: FileTreeNode) {
    this.projectName = projectName
    if (fileTree) {
      void this.updateData(fileTree)
    }
  }

  /** Update the tree using a backend fileTree */
  public async updateData(fileTree: FileTreeNode) {
    const newData: Record<TreeItemIndex, TreeItem> = {}
    await this.traverse(fileTree, null, newData)

    this.data = newData
    this.notifyListeners(['root'])
  }

  private async traverse(
    node: FileTreeNode,
    parentIndex: TreeItemIndex | null,
    newData: Record<TreeItemIndex, TreeItem>,
  ): Promise<TreeItemIndex | null> {
    const index = parentIndex === null ? 'root' : `${parentIndex}/${node.name}`

    if (parentIndex === null) {
      newData[index] = this.createBaseItem(index, 'Configurations', true)
    }

    if (this.shouldSkipNode(node, parentIndex)) {
      return null
    }

    if (node.type === 'DIRECTORY') {
      return this.processDirectoryNode(node, index, newData)
    }

    if (node.type === 'FILE') {
      await this.processFileNode(node, index, newData)
      return index
    }

    return null
  }

  /** Helper to determine if a node should be ignored */
  private shouldSkipNode(node: FileTreeNode, parentIndex: TreeItemIndex | null): boolean {
    return parentIndex !== null && node.type === 'FILE' && !node.name.endsWith('.xml')
  }

  /** Helper to create a standard TreeItem object */
  private createBaseItem(index: string, data: string | object, isFolder: boolean): TreeItem {
    return {
      index,
      data,
      children: [],
      isFolder,
    }
  }

  private async processFileNode(
    node: FileTreeNode,
    index: string,
    newData: Record<TreeItemIndex, TreeItem>,
  ): Promise<void> {
    newData[index] = this.createBaseItem(index, node.name.replace(/\.xml$/, ''), true)

    try {
      const adapterNames = await getAdapterNamesFromConfiguration(this.projectName, node.path)

      for (const adapterName of adapterNames) {
        const adapterIndex = `${index}/${adapterName}`

        const listenerName = await getAdapterListenerType(this.projectName, node.path, adapterName)

        newData[adapterIndex] = this.createBaseItem(
          adapterIndex,
          { adapterName, configPath: node.path, listenerName },
          false,
        )

        newData[index].children!.push(adapterIndex)
      }
    } catch (error) {
      console.error(`Failed to load adapters for ${node.path}:`, error)
    }
  }

  private async processDirectoryNode(
    node: FileTreeNode,
    index: string,
    newData: Record<TreeItemIndex, TreeItem>,
  ): Promise<TreeItemIndex | null> {
    if (!newData[index]) {
      newData[index] = this.createBaseItem(index, node.name, true)
    }

    if (node.children) {
      for (const child of node.children) {
        const childIndex = await this.traverse(child, index, newData)
        if (childIndex) {
          newData[index].children!.push(childIndex)
        }
      }
    }

    if (index !== 'root' && newData[index].children!.length === 0) {
      delete newData[index]
      return null
    }

    return index
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
