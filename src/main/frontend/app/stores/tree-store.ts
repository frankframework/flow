import { create } from 'zustand'

type TreeStoreState = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  clearConfigs: () => void

  editorExpandedItems: string[]
  addEditorExpandedItem: (item: string) => void
  removeEditorExpandedItem: (item: string) => void

  studioExpandedItems: string[]
  addStudioExpandedItem: (item: string) => void
  removeStudioExpandedItem: (item: string) => void

  clearExpandedItems: () => void
}

export const useTreeStore = create<TreeStoreState>((set) => ({
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  clearConfigs: () =>
    set({
      isLoading: true,
      editorExpandedItems: [],
      studioExpandedItems: [],
    }),

  editorExpandedItems: [],
  addEditorExpandedItem: (item) =>
    set((state) => ({
      editorExpandedItems: [...new Set([...state.editorExpandedItems, item])],
    })),
  removeEditorExpandedItem: (item) =>
    set((state) => ({
      editorExpandedItems: state.editorExpandedItems.filter((index) => index !== item),
    })),

  studioExpandedItems: [],
  addStudioExpandedItem: (item) =>
    set((state) => ({
      studioExpandedItems: [...new Set([...state.studioExpandedItems, item])],
    })),
  removeStudioExpandedItem: (item) =>
    set((state) => ({
      studioExpandedItems: state.studioExpandedItems.filter((index) => index !== item),
    })),

  clearExpandedItems: () => set({ editorExpandedItems: [], studioExpandedItems: [] }),
}))
