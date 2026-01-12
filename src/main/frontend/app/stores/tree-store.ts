import type { TreeItem, TreeItemIndex } from 'react-complex-tree'
import { create } from 'zustand'

interface TreeStoreState {
  providerData: Record<TreeItemIndex, TreeItem> | null
  treeHash: string | null
  setProviderData: (data: Record<TreeItemIndex, TreeItem>, hash: string) => void
  clearCache: () => void
}

export const useTreeStore = create<TreeStoreState>((set) => ({
  providerData: null,
  treeHash: null,
  setProviderData: (data, hash) =>
    set({
      providerData: data,
      treeHash: hash,
    }),
  clearCache: () =>
    set({
      providerData: null,
      treeHash: null,
    }),
}))
