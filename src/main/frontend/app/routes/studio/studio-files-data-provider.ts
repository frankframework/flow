import type { Disposable, TreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree'

interface ConfigWithAdapters {
  configName: string
  adapterNames: string[]
}

export default class StudioFilesDataProvider implements TreeDataProvider {
  private data: Record<TreeItemIndex, TreeItem> = {}
  private treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = []

  constructor(configs: ConfigWithAdapters[]) {
    this.updateData(configs)
  }

  public updateData(configs: ConfigWithAdapters[]) {
    this.buildTree(configs)
    this.notifyListeners(['root'])
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

  private buildTree(configs: ConfigWithAdapters[]) {
    const newData: Record<TreeItemIndex, TreeItem> = {}

    // Root
    newData['root'] = {
      index: 'root',
      data: 'Configurations',
      children: configs.map((configuration) => configuration.configName),
      isFolder: true,
    }

    // Config folders and adapters
    for (const { configName, adapterNames } of configs) {
      const folderName = configName.replace(/\.xml$/i, '')
      newData[configName] = {
        index: configName,
        data: folderName,
        children: adapterNames, // only matching adapters
        isFolder: true,
      }

      for (const adapterName of adapterNames) {
        newData[adapterName] = {
          index: adapterName,
          data: { adapterName, configName },
          isFolder: false,
        }
      }
    }

    this.data = newData
  }

  private notifyListeners(itemIds: TreeItemIndex[]) {
    for (const listener of this.treeChangeListeners) listener(itemIds)
  }
}
