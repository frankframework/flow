import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GitHunk } from '~/types/git.types'

export type DiffTabData = {
  oldContent: string
  newContent: string
  filePath: string
  hunks: GitHunk[]
}

export type EditorTabData = {
  name: string
  configurationPath: string
  type?: 'editor' | 'diff'
  diffData?: DiffTabData
}

export type PendingHighlight = {
  subtype: string
  name?: string
}

type EditorTabStoreState = {
  tabs: Record<string, EditorTabData>
  activeTabFilePath: string
  refreshCounter: number
  pendingHighlight: PendingHighlight | null
  setTabData: (tabId: string, data: EditorTabData) => void
  getTab: (tabId: string) => EditorTabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: string) => void
  removeTabAndSelectFallback: (tabId: string) => void
  clearTabs: () => void
  refreshAllTabs: () => void
  setPendingHighlight: (highlight: PendingHighlight | null) => void
}

const useEditorTabStore = create<EditorTabStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: {},
    activeTabFilePath: '',
    refreshCounter: 0,
    pendingHighlight: null,
    setTabData: (tabId, data) =>
      set((state) => ({
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...state.tabs[tabId],
            ...data,
          },
        },
      })),
    getTab: (tabId) => get().tabs[tabId],
    setActiveTab: (tabId) => set({ activeTabFilePath: tabId }),
    removeTab: (tabId) =>
      set((state) => {
        const newTabs = { ...state.tabs }
        delete newTabs[tabId]
        return { tabs: newTabs }
      }),
    removeTabAndSelectFallback: (tabId) =>
      set((state) => {
        const newTabs = { ...state.tabs }
        delete newTabs[tabId]
        const remainingKeys = Object.keys(newTabs)
        return {
          tabs: newTabs,
          activeTabFilePath: remainingKeys.includes(state.activeTabFilePath)
            ? state.activeTabFilePath
            : (remainingKeys.at(-1) ?? ''),
        }
      }),
    clearTabs: () => set({ tabs: {}, activeTabFilePath: '' }),
    refreshAllTabs: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
    setPendingHighlight: (highlight) => set({ pendingHighlight: highlight }),
  })),
)

export default useEditorTabStore
