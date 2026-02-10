import { create } from 'zustand'

export enum SidebarSide {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

export type VisibilityState = [boolean, boolean, boolean]

interface SidebarState {
  visibility: Record<string, VisibilityState>
  setVisibility: (name: string, side: SidebarSide, value: boolean) => void
  getVisibility: (name: string) => VisibilityState
}

const DEFAULT_VISIBILITY: VisibilityState = [true, true, true]

export const useSidebarStore = create<SidebarState>((set, get) => ({
  visibility: {},

  setVisibility: (name, side, value) =>
    set((state) => {
      const current = state.visibility[name] ?? [...DEFAULT_VISIBILITY]
      const updated: VisibilityState = [...current] as VisibilityState
      updated[side] = value
      return {
        visibility: {
          ...state.visibility,
          [name]: updated,
        },
      }
    }),

  getVisibility: (name) => {
    return get().visibility[name] ?? DEFAULT_VISIBILITY
  },
}))
