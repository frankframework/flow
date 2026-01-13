import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

export interface FileNode {
  name: string
  path: string
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'FILE' | 'DIRECTORY'
  children?: FileTreeNode[]
}

export default class EditorFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem<FileNode>> = {}
  private readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  private readonly projectName: string

  constructor(projectName: string) {
    this.projectName = projectName
    this.fetchAndBuildTree()
  }

  /** Fetch file tree from backend and build the provider's data */
  private async fetchAndBuildTree() {
    try {
      const response = await fetch(`/api/projects/${this.projectName}/tree`)
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)

      const tree: FileTreeNode = await response.json()
      this.buildTreeFromFileTree(tree)
      this.notifyListeners(['root'])
    } catch (error) {
      console.error('Failed to load project tree for EditorFilesDataProvider', error)
    }
  }

  /** Converts the backend file tree to react-complex-tree data */
  private buildTreeFromFileTree(rootNode: FileTreeNode) {
    const newData: Record<TreeItemIndex, TreeItem<FileNode>> = {}

    const traverse = (node: FileTreeNode, parentIndex: TreeItemIndex | null): TreeItemIndex => {
      const index = parentIndex === null ? 'root' : `${parentIndex}/${node.name}`

      newData[index] = {
        index,
        data: {
          name: node.name,
          path: node.path,
        },
        children: node.type === 'DIRECTORY' ? [] : undefined,
        isFolder: node.type === 'DIRECTORY',
      }

      if (node.type === 'DIRECTORY' && node.children) {
        for (const child of node.children) {
          const childIndex = traverse(child, index)
          newData[index].children!.push(childIndex)
        }
      }

      return index
    }

    traverse(rootNode, null)
    this.data = newData
  }

  public async getAllItems(): Promise<TreeItem<FileNode>[]> {
    return Object.values(this.data)
  }

  public async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<FileNode>> {
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
    this.data[item.index].data.name = name
  }

  /** Notify all listeners that certain nodes changed */
  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
