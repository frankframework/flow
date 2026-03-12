import { create } from 'zustand'
import type { Project } from '~/types/project.types'
import { useTreeStore } from '~/stores/tree-store'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'

const STORAGE_KEY = 'active-project-name'
const STORAGE_ROOT_PATH_KEY = 'active-project-root-path'

interface ProjectStoreState {
  project?: Project
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  project: undefined,
  setProject: (project: Project) => {
    set((state) => {
      if (state.project?.name !== project.name) {
        useTreeStore.getState().clearExpandedItems()
        useTabStore.getState().clearTabs()
        useEditorTabStore.getState().clearTabs()
      }
      return { project }
    })
    localStorage.setItem(STORAGE_KEY, project.name)
    localStorage.setItem(STORAGE_ROOT_PATH_KEY, project.rootPath)
  },
  clearProject: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_ROOT_PATH_KEY)
    useTreeStore.getState().clearExpandedItems()
    useTabStore.getState().clearTabs()
    useEditorTabStore.getState().clearTabs()
    set({ project: undefined })
  },
}))

export function getStoredProjectName(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function getStoredProjectRootPath(): string | null {
  return localStorage.getItem(STORAGE_ROOT_PATH_KEY)
}
