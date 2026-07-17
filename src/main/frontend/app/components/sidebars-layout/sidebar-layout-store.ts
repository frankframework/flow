import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum SidebarSide {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

export type VisibilityState = [boolean, boolean, boolean]

type SideBarInstance = {
  visible: VisibilityState
  sizes: number[]
}

type SidebarState = {
  instances: Record<string, SideBarInstance>
  initializeInstance: (name: string, defaultVisible?: VisibilityState) => void
  toggleSidebar: (name: string, side: SidebarSide) => void
  setSizes: (name: string, sizes: number[]) => void
  setVisible: (name: string, side: SidebarSide, value: boolean) => void
  getSizes: (name: string) => number[] | undefined
  getVisibility: (name: string) => VisibilityState | undefined
}

const DEFAULT_VISIBILITY: VisibilityState = [true, true, true]

export const useSidebarStore = create<SidebarState>()(
  persist(
    (
      set,
      get,
    ): {
      instances: Record<string, SideBarInstance>
      initializeInstance: (name: string, defaultVisible?: VisibilityState | undefined) => unknown
      toggleSidebar: (name: string, side: SidebarSide) => unknown
      setSizes: (name: string, sizes: number[]) => unknown
      setVisible: (name: string, side: SidebarSide, value: boolean) => unknown
      getSizes: (name: string) => number[] | undefined
      getVisibility: (name: string) => VisibilityState | undefined
    } => ({
      instances: {},

      initializeInstance: (name, defaultVisible = DEFAULT_VISIBILITY): void =>
        set(
          (
            state,
          ):
            | SidebarState
            | { instances: Record<string, SideBarInstance | { visible: VisibilityState; sizes: never[] }> } => {
            if (state.instances[name]) return state

            return {
              instances: {
                ...state.instances,
                [name]: {
                  visible: defaultVisible,
                  sizes: [],
                },
              },
            }
          },
        ),

      toggleSidebar: (name, side): void =>
        set((state): Partial<SidebarState> => {
          const instance = state.instances[name]
          if (!instance) return state

          const newVisible = [...instance.visible] as VisibilityState
          newVisible[side] = !newVisible[side]

          return updateInstanceState(state, name, { visible: newVisible })
        }),

      setSizes: (name, sizes): void =>
        set((state): Partial<SidebarState> => {
          const instance = state.instances[name]
          if (!instance) return state

          return updateInstanceState(state, name, { sizes })
        }),

      setVisible: (name, side, value): void =>
        set((state): Partial<SidebarState> => {
          const instance = state.instances[name]
          if (!instance) return state

          const newVisible = [...instance.visible] as VisibilityState
          newVisible[side] = value

          return updateInstanceState(state, name, { visible: newVisible })
        }),

      getSizes: (name): number[] => get().instances[name]?.sizes,
      getVisibility: (name): VisibilityState => get().instances[name]?.visible,
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
