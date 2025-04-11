import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'
import items from '~/routes/editor/fake-files'

export default class CustomDataProviderImplementation implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = { ...items }

  private treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []

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

  public injectItem(name: string) {
    const rand = `${crypto.getRandomValues(new Uint32Array(1))[0]}`
    this.data[rand] = { data: name, index: rand } as TreeItem
    this.data.root.children?.push(rand)
    for (const listener of this.treeChangeListeners) listener(['root'])
  }
}
