import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum SidebarIndex {
  LEFT = 0,
  RIGHT = 2,
}

export type VisibilityState = [boolean, boolean, boolean]

interface SideBarInstance {
  visible: VisibilityState
  sizes: number[]
}

interface SidebarState {
  instances: Record<string, SideBarInstance>

  initializeInstance: (instanceId: string, defaultVisible?: VisibilityState) => void
  toggleSidebar: (instanceId: string, index: SidebarIndex) => void
  setSizes: (instanceId: string, sizes: number[]) => void
  setVisible: (instanceId: string, index: SidebarIndex, value: boolean) => void
}

const DEFAULT_VISIBILITY: VisibilityState = [true, true, true]

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      instances: {},

      initializeInstance: (instanceId, defaultVisible = DEFAULT_VISIBILITY) =>
        set((state) => {
          // Don't modify state if instance already exists
          if (state.instances[instanceId]) {
            return state
          }

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                visible: defaultVisible,
                sizes: [],
              },
            },
          }
        }),

      toggleSidebar: (instanceId, index) =>
        set((state) => {
          const instance = state.instances[instanceId]
          if (!instance) return state

          // Create a new visibility array with the toggled value
          const newVisible: VisibilityState = [...instance.visible]
          newVisible[index] = !newVisible[index]

          return updateInstanceState(state, instanceId, { visible: newVisible })
        }),

      setSizes: (instanceId, sizes) =>
        set((state) => {
          const instance = state.instances[instanceId]
          if (!instance) return state

          return updateInstanceState(state, instanceId, { sizes })
        }),

      setVisible: (instanceId, index, value) =>
        set((state) => {
          const instance = state.instances[instanceId]
          if (!instance) return state

          // Create a new visibility array with the changed value
          const newVisible: VisibilityState = [...instance.visible]
          newVisible[index] = value

          return updateInstanceState(state, instanceId, { visible: newVisible })
        }),
    }),
    {
      name: 'sidebar-storage',
    },
  ),
)

function updateInstanceState(
  state: SidebarState,
  instanceId: string,
  updates: Partial<SideBarInstance>,
): Partial<SidebarState> {
  return {
    instances: {
      ...state.instances,
      [instanceId]: {
        ...state.instances[instanceId],
        ...updates,
      },
    },
  }
}
