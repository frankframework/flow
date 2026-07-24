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

export const useTreeStore = create<TreeStoreState>(
  (
    set,
  ): {
    isLoading: true
    setIsLoading: (isLoading: boolean) => void
    clearConfigs: () => void
    editorExpandedItems: never[]
    addEditorExpandedItem: (item: string) => void
    removeEditorExpandedItem: (item: string) => void
    studioExpandedItems: never[]
    addStudioExpandedItem: (item: string) => void
    removeStudioExpandedItem: (item: string) => void
    clearExpandedItems: () => void
  } => ({
    isLoading: true,
    setIsLoading: (isLoading): void => set({ isLoading }),
    clearConfigs: (): void =>
      set({
        isLoading: true,
        editorExpandedItems: [],
        studioExpandedItems: [],
      }),

    editorExpandedItems: [],
    addEditorExpandedItem: (item): void =>
      set((state): { editorExpandedItems: string[] } => ({
        editorExpandedItems: [...new Set([...state.editorExpandedItems, item])],
      })),
    removeEditorExpandedItem: (item): void =>
      set((state): { editorExpandedItems: string[] } => ({
        editorExpandedItems: state.editorExpandedItems.filter((index): boolean => index !== item),
      })),

    studioExpandedItems: [],
    addStudioExpandedItem: (item): void =>
      set((state): { studioExpandedItems: string[] } => ({
        studioExpandedItems: [...new Set([...state.studioExpandedItems, item])],
      })),
    removeStudioExpandedItem: (item): void =>
      set((state): { studioExpandedItems: string[] } => ({
        studioExpandedItems: state.studioExpandedItems.filter((index): boolean => index !== item),
      })),

    clearExpandedItems: (): void => set({ editorExpandedItems: [], studioExpandedItems: [] }),
  }),
)
