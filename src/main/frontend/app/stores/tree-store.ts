import { create } from 'zustand'

interface TreestoreState {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  clearConfigs: () => void
}

export const useTreeStore = create<TreestoreState>((set) => ({
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  clearConfigs: () => set({ isLoading: true }),
}))
