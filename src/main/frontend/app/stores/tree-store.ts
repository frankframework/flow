import type { ConfigWithAdapters } from '~/components/file-structure/file-structure'
import { create } from 'zustand'

interface TreestoreState {
  configs: ConfigWithAdapters[]
  isLoading: boolean
  setConfigs: (configs: ConfigWithAdapters[]) => void
  setIsLoading: (loading: boolean) => void
  clearConfigs: () => void
}

export const useTreeStore = create<TreestoreState>((set) => ({
  configs: [],
  isLoading: true,
  setConfigs: (configs) => set({ configs }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearConfigs: () => set({ configs: [], isLoading: true }),
}))
