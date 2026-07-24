import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { FlowSnapshot } from './flow-store'

export type TabData = {
  name: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  flowJson?: Record<string, unknown>
  configurationPath: string
  adapterPosition?: number
  history?: FlowSnapshot[]
  future?: FlowSnapshot[]
  pendingNodeSelection?: { subtype: string; name: string } | null
  pendingRecenter?: boolean | null
}

type TabStoreState = {
  tabs: Record<string, TabData>
  activeTab: string
  setTabData: (tabId: string, data: TabData) => void
  getTab: (tabId: string | undefined) => TabData | undefined
  setActiveTab: (tabId: string | undefined) => void
  removeTab: (tabId: string) => void
  removeTabAndSelectFallback: (tabId: string) => void
  removeTabsForConfig: (configPath: string) => void
  renameTabsForConfig: (oldConfigPath: string, newConfigPath: string) => void
  clearTabs: () => void
}

const useTabStore = create<TabStoreState>()(
  subscribeWithSelector(
    (
      set,
      get,
    ): {
      tabs: Record<string, TabData>
      activeTab: string
      setTabData: (tabId: string, data: TabData) => void
      getTab: (tabId: string | undefined) => TabData | undefined
      setActiveTab: (tabId: string | undefined) => void
      removeTab: (tabId: string) => void
      removeTabAndSelectFallback: (tabId: string) => void
      removeTabsForConfig: (configPath: string) => void
      renameTabsForConfig: (oldConfigPath: string, newConfigPath: string) => void
      clearTabs: () => void
    } => ({
      tabs: {},
      activeTab: '',
      setTabData: (tabId, data): void =>
        set(
          (
            state,
          ): {
            tabs: Record<
              string,
              | TabData
              | {
                  name: string
                  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
                  flowJson?: Record<string, unknown>
                  configurationPath: string
                  adapterPosition?: number
                  history?: FlowSnapshot[]
                  future?: FlowSnapshot[]
                  pendingNodeSelection?: { subtype: string; name: string } | null
                  pendingRecenter?: boolean | null
                }
            >
          } => ({
            tabs: {
              ...state.tabs,
              [tabId]: {
                ...state.tabs[tabId],
                ...data,
              },
            },
          }),
        ),
      getTab: (tabId): TabData | undefined => (tabId ? get().tabs[tabId] : undefined),
      setActiveTab: (tabId): void => set({ activeTab: tabId ?? '' }),
      removeTab: (tabId): void =>
        set((state): { tabs: Record<string, TabData> } => {
          const newTabs = { ...state.tabs }
          delete newTabs[tabId]
          return { tabs: newTabs }
        }),
      removeTabAndSelectFallback: (tabId): void =>
        set((state): { tabs: Record<string, TabData>; activeTab: string } => {
          const newTabs = { ...state.tabs }
          delete newTabs[tabId]
          const remainingKeys = Object.keys(newTabs)
          return {
            tabs: newTabs,
            activeTab: remainingKeys.includes(state.activeTab) ? state.activeTab : (remainingKeys.at(-1) ?? ''),
          }
        }),
      removeTabsForConfig: (configPath): void =>
        set((state): { tabs: Record<string, TabData>; activeTab: string } => {
          const newTabs = { ...state.tabs }
          for (const [tabId, tab] of Object.entries(newTabs)) {
            if (tab.configurationPath === configPath) delete newTabs[tabId]
          }

          const remainingKeys = Object.keys(newTabs)
          return {
            tabs: newTabs,
            activeTab: remainingKeys.includes(state.activeTab) ? state.activeTab : (remainingKeys.at(-1) ?? ''),
          }
        }),
      renameTabsForConfig: (oldConfigPath, newConfigPath): void =>
        set((state): { tabs: Record<string, TabData>; activeTab: string } => {
          const newTabs: Record<string, TabData> = {}
          let newActiveTab = state.activeTab
          for (const [tabId, tab] of Object.entries(state.tabs)) {
            if (tab.configurationPath === oldConfigPath) {
              const newTabId = tabId.replace(oldConfigPath, () => newConfigPath)
              newTabs[newTabId] = { ...tab, configurationPath: newConfigPath }
              if (state.activeTab === tabId) newActiveTab = newTabId
            } else {
              newTabs[tabId] = tab
            }
          }
          return { tabs: newTabs, activeTab: newActiveTab }
        }),
      clearTabs: (): void => set({ tabs: {}, activeTab: '' }),
    }),
  ),
)

export default useTabStore
