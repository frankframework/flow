import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface EditorTabData {
  fileName: string
  filePath: string
}

interface EditorTabStoreState {
  tabs: Record<string, EditorTabData>
  activeTabFilePath: string
  setTabData: (tabId: string, data: EditorTabData) => void
  getTab: (tabId: string) => EditorTabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: string) => void
  removeTabAndSelectFallback: (tabId: string) => void
  clearTabs: () => void
}

const useEditorTabStore = create<EditorTabStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: {},
    activeTabFilePath: '',
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
          activeTabFilePath: remainingKeys.includes(state.activeTabFilePath) ? state.activeTabFilePath : (remainingKeys.at(-1) ?? ''),
        }
      }),
    clearTabs: () => set({ tabs: {}, activeTabFilePath: '' }),
  })),
)

export default useEditorTabStore
