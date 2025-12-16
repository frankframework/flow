import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

export interface FileNode {
  path: string
  isDirectory: boolean
}

export default class EditorFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private readonly rootName: string

  constructor(rootName: string, paths: string[]) {
    this.rootName = rootName
    this.buildTree(rootName, paths)
  }

  public async getAllItems(): Promise<TreeItem[]> {
    return Object.values(this.data)
  }

  public updateData(paths: string[]) {
    this.buildTree(this.rootName, paths)
    this.notifyListeners(['root'])
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

  public async onRenameItem(item: TreeItem, name: string): Promise<void> {
    this.data[item.index].data = name
  }

  private buildTree(rootName: string, paths: string[]) {
    const newData: Record<TreeItemIndex, TreeItem> = {}

    // Root
    newData['root'] = {
      index: 'root',
      data: rootName,
      children: [],
      isFolder: true,
    }

    for (const fullPath of paths) {
      const parts = fullPath.split('/')

      let parentIndex: TreeItemIndex = 'root'

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1
        const nodeIndex = `${parentIndex}/${part}`

        if (!newData[nodeIndex]) {
          newData[nodeIndex] = {
            index: nodeIndex,
            data: part,
            children: isLast ? undefined : [],
            isFolder: !isLast,
          }
        }

        const parent = newData[parentIndex]
        parent.children ??= []
        if (!parent.children.includes(nodeIndex)) {
          parent.children.push(nodeIndex)
        }

        parentIndex = nodeIndex
      }
    }

    this.data = newData
  }

  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
