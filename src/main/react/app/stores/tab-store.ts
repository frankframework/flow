import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import FolderIcon from '/icons/solar/Folder.svg?react'

interface TabData {
  value: string
  icon?: React.ComponentType<any>
  flowJson?: Record<string, any>
}

interface TabStoreState {
  tabs: Record<string, TabData>
  activeTab: string
  setTabData: (tabId: string, data: TabData) => void
  getTab: (tabId: string) => TabData | undefined
  setActiveTab: (tabId: string) => void
  removeTab: (tabId: string) => void
}

const useTabStore = create<TabStoreState>()(
  subscribeWithSelector((set, get) => ({
    tabs: {
      tab1: { value: 'tab1', icon: FolderIcon },
      tab2: { value: 'tab2' },
      tab3: { value: 'tab3' },
      tab4: { value: 'tab4' },
      tab5: { value: 'tab5' },
      tab6: { value: 'tab6' },
      tab7: { value: 'tab7' },
      tab8: { value: 'tab8' },
      tab9: { value: 'tab9' },
      tab10: { value: 'tab10' },
    },
    activeTab: 'tab1',
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
  })),
)

export default useTabStore
