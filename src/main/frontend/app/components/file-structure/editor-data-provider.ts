import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
}

export default class EditorFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem<FileNode>> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private readonly rootName: string

  constructor(rootName: string, paths: string[]) {
    this.rootName = rootName
    this.buildTree(rootName, paths)
  }

  public async getAllItems(): Promise<TreeItem<FileNode>[]> {
    return Object.values(this.data)
  }

  public async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<FileNode>> {
    return this.data[itemId]
  }

  public updateData(paths: string[]) {
    this.buildTree(this.rootName, paths)
    this.notifyListeners(['root'])
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
    this.data[item.index].data.name = name
  }

  private buildTree(rootName: string, paths: string[]) {
    const newData: Record<TreeItemIndex, TreeItem<FileNode>> = {
      root: {
        index: 'root',
        data: {
          name: rootName,
          path: '',
          isDirectory: true,
        },
        children: [],
        isFolder: true,
      },
    }

    for (const fullPath of paths) {
      this.addPathToTree(newData, fullPath)
    }

    this.data = newData
  }

  private addPathToTree(
    tree: Record<TreeItemIndex, TreeItem<FileNode>>,
    fullPath: string,
    rootIndex: TreeItemIndex = 'root',
  ): TreeItemIndex {
    const parts = fullPath.split('/')

    let parentIndex: TreeItemIndex = rootIndex
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      const nodeIndex: TreeItemIndex = `${parentIndex}/${part}`

      if (!tree[nodeIndex]) {
        tree[nodeIndex] = {
          index: nodeIndex,
          data: {
            name: part,
            path: currentPath,
            isDirectory: !isLast,
          },
          children: isLast ? undefined : [],
          isFolder: !isLast,
        }
      }

      const parent = tree[parentIndex]
      parent.children ??= []
      if (!parent.children.includes(nodeIndex)) {
        parent.children.push(nodeIndex)
      }

      parentIndex = nodeIndex
    }

    return parentIndex
  }

  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
