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

/**
 * Returned when creating an adapter or configuration file. Points the studio at the adapter to open;
 * the adapter's content is fetched lazily when the studio renders it. `adapterName` is null when the
 * created file contains no adapter.
 */
export interface AdapterLocationResponse {
  adapterName: string | null
  adapterPosition: number
}
