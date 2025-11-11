import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface TabData {
  value: string
  icon?: React.ComponentType<any>
  flowJson?: Record<string, any>
  configurationName: string
}

interface TabStoreState {
  tabs: Record<string, TabData>
  activeTab: string
  setTabData: (tabId: string, data: TabData) => void
  getTab: (tabId: string) => TabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: string) => void
  removeTabAndSelectFallback: (tabId: string) => void
}

const useTabStore = create<TabStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: {},
    activeTab: '',
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
    setActiveTab: (tabId) => set({ activeTab: tabId }),
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
          activeTab: remainingKeys.includes(state.activeTab) ? state.activeTab : (remainingKeys.at(-1) ?? ''),
        }
      }),
  })),
)

export default useTabStore
