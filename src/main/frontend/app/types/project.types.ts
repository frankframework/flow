export interface Project {
  name: string
  rootPath: string
  filepaths: string[]
  filters: Record<string, boolean>
}

export interface ProjectCreateDTO {
  rootPath: string
}
