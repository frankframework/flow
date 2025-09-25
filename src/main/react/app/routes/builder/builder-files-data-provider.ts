import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

interface ConfigWithAdapters {
  configName: string
  adapterNames: string[]
}

export default class BuilderFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}

  private treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []

  constructor(configs: ConfigWithAdapters[]) {
    this.updateData(configs)
  }

  public updateData(configs: ConfigWithAdapters[]) {
    // Build tree structure here
    this.data = {}

    // Root node
    this.data['root'] = {
      index: 'root',
      data: 'Configurations',
      children: configs.map(({ configName }) => configName),
      isFolder: true,
    }

    // Each config folder
    for (const { configName, adapterNames } of configs) {
      this.data[configName] = {
        index: configName,
        data: configName,
        children: adapterNames,
        isFolder: true,
      }
      // Each adapter is a leaf node (no children)
      for (const adapterName of adapterNames) {
        this.data[adapterName] = {
          index: adapterName,
          data: {
            adapterName: adapterName,
            configName: configName,
          },
          isFolder: false,
        }
      }
    }

    // Notify listeners that root changed, so tree updates
    for (const listener of this.treeChangeListeners) listener(['root'])
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

  public injectItem(name: string) {
    const rand = `${crypto.getRandomValues(new Uint32Array(1))[0]}`
    this.data[rand] = { data: name, index: rand } as TreeItem
    this.data.root.children?.push(rand)
    for (const listener of this.treeChangeListeners) listener(['root'])
  }
}
