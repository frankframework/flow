import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum SidebarSide {
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

  initializeInstance: (name: string, defaultVisible?: VisibilityState) => void
  toggleSidebar: (name: string, side: SidebarSide) => void
  setSizes: (name: string, sizes: number[]) => void
  setVisible: (name: string, side: SidebarSide, value: boolean) => void
}

const DEFAULT_VISIBILITY: VisibilityState = [true, true, true]

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      instances: {},

      initializeInstance: (name, defaultVisible = DEFAULT_VISIBILITY) =>
        set((state) => {
          // Don't modify state if instance already exists
          if (state.instances[name]) {
            return state
          }

          return {
            instances: {
              ...state.instances,
              [name]: {
                visible: defaultVisible,
                sizes: [],
              },
            },
          }
        }),

      toggleSidebar: (name, side) =>
        set((state) => {
          const instance = state.instances[name]
          if (!instance) return state

          // Create a new visibility array with the toggled value
          const newVisible: VisibilityState = [...instance.visible]
          newVisible[side] = !newVisible[side]

          return updateInstanceState(state, name, { visible: newVisible })
        }),

      setSizes: (name, sizes) =>
        set((state) => {
          const instance = state.instances[name]
          if (!instance) return state

          return updateInstanceState(state, name, { sizes })
        }),

      setVisible: (name, side, value) =>
        set((state) => {
          const instance = state.instances[name]
          if (!instance) return state

          // Create a new visibility array with the changed value
          const newVisible: VisibilityState = [...instance.visible]
          newVisible[side] = value

          return updateInstanceState(state, name, { visible: newVisible })
        }),
    }),
    {
      name: 'sidebar-storage',
    },
  ),
)

function updateInstanceState(
  state: SidebarState,
  name: string,
  updates: Partial<SideBarInstance>,
): Partial<SidebarState> {
  return {
    instances: {
      ...state.instances,
      [name]: {
        ...state.instances[name],
        ...updates,
      },
    },
  }
}
