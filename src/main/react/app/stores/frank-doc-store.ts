import { create } from 'zustand'

const FRANK_DOC_URL = 'http://localhost:3000/js/frankdoc.json'

interface FrankDocStoreState {
  frankDocRaw?: any
  isLoading: boolean
  error?: string
  fetchFile: () => Promise<void>
}

const useFrankDocStore = create<FrankDocStoreState>((set) => ({
  isLoading: false,

  fetchFile: async () => {
    if (useFrankDocStore.getState().frankDocRaw) return

    set({ isLoading: true, error: undefined })

    try {
      const response = await fetch(FRANK_DOC_URL)

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      const data = await response.json()

      set({ frankDocRaw: data, isLoading: false })
    } catch (error) {
      console.error('Error fetching file:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  resetFileData: () => set({ frankDocRaw: undefined, isLoading: false, error: undefined }),
}))

export default useFrankDocStore
