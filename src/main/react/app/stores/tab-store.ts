import { create } from 'zustand'

type TabData = Record<string, any>

interface TabStoreState {
  tabs: Record<string, TabData>
  activeTab: string
  setTab: (tabId: string, data: TabData) => void
  getTab: (tabId: string) => TabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: number) => void
}

const useTabStore = create<TabStoreState>((set, get) => ({
  tabs: {},
  activeTab: '',
  setTab: (tabId, flowJson) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: flowJson,
      },
    })),
  getTab: (tabId) => get().tabs[tabId],
  setActiveTab: (tabId) => set({ activeTab: tabId }),
  removeTab: (tabId) =>
    set((state) => {
      const newTabs = { ...state.tabs }
      delete newTabs[tabId]
      return { tabs: newTabs }
    }),
}))

export default useTabStore
