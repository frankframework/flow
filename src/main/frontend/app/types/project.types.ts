export interface ConfigurationProject {
  name: string
  rootPath: string
  filepaths: string[]
  filters: Record<string, boolean>
  isGitRepository: boolean
  hasStoredToken: boolean
}

export interface RecentConfigurationProject {
  name: string
  rootPath: string
  lastOpened: string
}

export interface XmlResponse {
  xmlContent: string
}
