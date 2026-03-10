import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

export abstract class BaseFilesDataProvider<TData = unknown> implements TreeDataProvider<TData> {
  protected data: Record<TreeItemIndex, TreeItem<TData>> = {}
  protected readonly treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []
  protected loadedDirectories = new Set<string>()

  public abstract loadDirectory(itemId: TreeItemIndex): Promise<void>

  public async reloadDirectory(itemId: TreeItemIndex): Promise<void> {
    const item = this.data[itemId]
    if (!item || !item.isFolder) return

    this.loadedDirectories.delete((item.data as { path?: string }).path ?? '')
    this.removeSubtree(itemId)
    item.children = []
    await this.loadDirectory(itemId)
  }

  private removeSubtree(parentId: TreeItemIndex): void {
    const item = this.data[parentId]
    if (!item?.children) return

    for (const childId of item.children) {
      this.removeSubtree(childId)
      const child = this.data[childId]
      const path = (child?.data as { path?: string })?.path
      if (child?.isFolder && path) {
        this.loadedDirectories.delete(path)
      }
      delete this.data[childId]
    }
  }

  public async getAllItems(): Promise<TreeItem<TData>[]> {
    return Object.values(this.data) as TreeItem<TData>[]
  }

  public async getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<TData>> {
    return this.data[itemId]
  }

  public async onChangeItemChildren(itemId: TreeItemIndex, newChildren: TreeItemIndex[]) {
    if (this.data[itemId]) {
      this.data[itemId].children = newChildren
      this.notifyListeners([itemId])
    }
  }

  public onDidChangeTreeData(listener: (changedItemIds: TreeItemIndex[]) => void): Disposable {
    this.treeChangeListeners.push(listener)
    return {
      dispose: () => {
        const index = this.treeChangeListeners.indexOf(listener)
        if (index !== -1) {
          this.treeChangeListeners.splice(index, 1)
        }
      },
    }
  }

  protected notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
