import { create } from 'zustand'
import type { Project } from '~/types/project.types'

const SESSION_KEY = 'active-project-name'

interface ProjectStoreState {
  project?: Project
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  project: undefined,
  setProject: (project: Project) => {
    localStorage.setItem(SESSION_KEY, project.name)
    set({ project })
  },
  clearProject: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ project: undefined })
  },
}))

export function getStoredProjectName(): string | null {
  return localStorage.getItem(SESSION_KEY)
}
