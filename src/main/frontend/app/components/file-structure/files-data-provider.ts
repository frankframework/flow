import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import type { FileTreeNode } from './editor-data-provider'
import { getAdapterListenerType, getAdapterNamesFromConfiguration } from '~/routes/studio/xml-to-json-parser'

export default class FilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private projectName: string

  constructor(projectName: string, fileTree?: FileTreeNode) {
    this.projectName = projectName
    if (fileTree) {
      void this.updateData(fileTree)
    }
  }

  /** Update the tree using a backend fileTree */
  public async updateData(fileTree: FileTreeNode) {
    const newData: Record<TreeItemIndex, TreeItem> = {
      root: {
        index: 'root',
        data: 'Configurations',
        children: [],
        isFolder: true,
      },
    }

    // Recursive traversal
    const traverse = async (node: FileTreeNode, parentIndex: TreeItemIndex): Promise<TreeItemIndex | null> => {
      // Ignore non-XML files
      if (node.type === 'FILE' && !node.name.endsWith('.xml')) return null

      const index = parentIndex === 'root' ? node.name : `${parentIndex}/${node.name}`

      if (node.type === 'DIRECTORY') {
        newData[index] = {
          index,
          data: node.name,
          children: [],
          isFolder: true,
        }

        if (node.children) {
          for (const child of node.children) {
            const childIndex = await traverse(child, index)
            if (childIndex && !newData[index].children!.includes(childIndex)) {
              newData[index].children!.push(childIndex)
            }
          }
        }

        // Remove empty directories
        if (newData[index].children!.length === 0) {
          delete newData[index]
          return null
        }

        return index
      }

      // FILE ending with .xml
      newData[index] = {
        index,
        data: node.name.replace(/\.xml$/, ''),
        children: [],
        isFolder: true, // treat .xml as folder to hold adapters
      }

      // Populate adapters using your shared function
      try {
        const adapterNames = await getAdapterNamesFromConfiguration(this.projectName, node.path)

        for (const adapterName of adapterNames) {
          const adapterIndex = `${index}/${adapterName}`
          newData[adapterIndex] = {
            index: adapterIndex,
            data: {
              adapterName,
              configPath: node.path,
              listenerName: await getAdapterListenerType(this.projectName, node.path, adapterName),
            },
            isFolder: false, // leaf node
          }
          newData[index].children!.push(adapterIndex)
        }
      } catch (error) {
        console.error(`Failed to load adapters for ${node.path}:`, error)
      }

      return index
    }

    // Traverse all children of the root folder
    if (fileTree.children) {
      for (const child of fileTree.children) {
        const childIndex = await traverse(child, 'root')
        if (childIndex) newData['root'].children!.push(childIndex)
      }
    }

    this.data = newData
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
