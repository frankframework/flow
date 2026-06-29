import { apiFetch } from '~/utils/api'

export interface AppInfo {
  isLocal: boolean
  maxImportSize: number
}

export async function fetchAppInfo(signal?: AbortSignal): Promise<AppInfo> {
  return apiFetch<AppInfo>('/app-info', { signal })
}
