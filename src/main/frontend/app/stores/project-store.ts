import { create } from 'zustand'
import type { Project } from '~/routes/projects/projects'

interface ProjectStoreState {
  project?: Project
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  project: undefined,
  setProject: (project: Project) => set({ project }),
  clearProject: () => set({ project: undefined }),
}))
