export interface Project {
  name: string
  rootPath: string
  filepaths: string[]
  filters: Record<string, boolean>
  isGitRepository: boolean
}

export interface RecentProject {
  name: string
  rootPath: string
  lastOpened: string
}
