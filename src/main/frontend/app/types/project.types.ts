export type ConfigurationProject = {
  name: string
  rootPath: string
  filepaths: string[]
  filters: Record<string, boolean>
  isGitRepository: boolean
  hasStoredToken: boolean
}

export type RecentConfigurationProject = {
  name: string
  rootPath: string
  lastOpened: string
}

export type XmlResponse = {
  xmlContent: string
}

export interface AdapterLocationResponse {
  adapterName: string | null
  adapterPosition: number
}
