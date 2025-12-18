import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { ConfigWithAdapters } from './file-structure'

interface AdapterNodeData {
  adapterName: string
  configName: string
  listenerName: string | null
}

export default class FilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []

  constructor(configs: ConfigWithAdapters[]) {
    this.updateData(configs)
  }

  public updateData(configs: ConfigWithAdapters[]) {
    this.buildTree(configs)
    this.notifyListeners(['root'])
  }

  public async getAllItems(): Promise<TreeItem[]> {
    return Object.values(this.data)
  }

  public async getTreeItem(itemId: TreeItemIndex) {
    return this.data[itemId]
  }

  public async onChangeItemChildren(itemId: TreeItemIndex, newChildren: TreeItemIndex[]) {
    this.data[itemId].children = newChildren
    for (const listener of this.treeChangeListeners) listener([itemId])
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
    this.data[item.index].data = name
  }

  private buildTree(configs: ConfigWithAdapters[]) {
    const newData: Record<TreeItemIndex, TreeItem> = {
      root: {
        index: 'root',
        data: 'Configurations',
        children: [],
        isFolder: true,
      },
    }

    for (const { configName, adapters } of configs) {
      // Remove the fixed src/main/configurations prefix
      const relativePath = configName.replace(/^src\/main\/configurations\//, '')

      // Split by / to create nested folders
      const parts = relativePath.split('/') // e.g. ["AMQP", "Configuration.xml"]

      let parentIndex = 'root'
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1

        const nodeIndex = `${parentIndex}/${part}` // unique index in tree

        // If node does not exist yet, create it
        if (!newData[nodeIndex]) {
          newData[nodeIndex] = {
            index: nodeIndex,
            data: isLast ? part.replace(/\.xml$/i, '') : part,
            children: isLast ? adapters.map((a) => a.adapterName) : [],
            isFolder: !isLast || adapters.length > 0,
          } as TreeItem
        }

        // Make sure parent has this child
        const parentNode = newData[parentIndex]
        if (!parentNode.children) parentNode.children = []
        if (!parentNode.children.includes(nodeIndex)) parentNode.children.push(nodeIndex)

        parentIndex = nodeIndex

        // Add adapters as children to the XML file node
        if (isLast) {
          for (const { adapterName, listenerName } of adapters) {
            newData[adapterName] = {
              index: adapterName,
              data: { adapterName, configName, listenerName } satisfies AdapterNodeData,
              isFolder: false,
            }
          }
        }
      }
    }

    this.data = newData
  }

  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
