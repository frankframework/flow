import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GitHunk } from '~/types/git.types'

export interface DiffTabData {
  oldContent: string
  newContent: string
  filePath: string
  hunks: GitHunk[]
}

export interface EditorTabData {
  name: string
  configurationPath: string
  type?: 'editor' | 'diff'
  diffData?: DiffTabData
}

interface EditorTabStoreState {
  tabs: Record<string, EditorTabData>
  activeTabFilePath: string
  refreshCounter: number
  setTabData: (tabId: string, data: EditorTabData) => void
  getTab: (tabId: string) => EditorTabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: string) => void
  removeTabAndSelectFallback: (tabId: string) => void
  clearTabs: () => void
  refreshAllTabs: () => void
}

const useEditorTabStore = create<EditorTabStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: {},
    activeTabFilePath: '',
    refreshCounter: 0,
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
  })),
)

export default useEditorTabStore
