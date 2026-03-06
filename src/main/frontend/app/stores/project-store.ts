import { create } from 'zustand'
import type { Project } from '~/types/project.types'
import { useTreeStore } from '~/stores/tree-store'
import useTabStore from '~/stores/tab-store'

const SESSION_KEY = 'active-project-name'

interface ProjectStoreState {
  project?: Project
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  project: undefined,
  setProject: (project: Project) => {
    set((state) => {
      if (state.project && state.project.name !== project.name) {
        useTreeStore.getState().clearExpandedItems()
        useTabStore.getState().clearTabs()
      }
      return { project }
    })
    sessionStorage.setItem(SESSION_KEY, project.name)
  },
  clearProject: () => {
    sessionStorage.removeItem(SESSION_KEY)
    useTreeStore.getState().clearExpandedItems()
    useTabStore.getState().clearTabs()
    set({ project: undefined })
  },
}))

export function getStoredProjectName(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}
