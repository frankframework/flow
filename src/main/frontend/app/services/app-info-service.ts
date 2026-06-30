import { apiFetch } from '~/utils/api'

export type AppInfo = {
  isLocal: boolean
}

export async function fetchAppInfo(signal?: AbortSignal): Promise<AppInfo> {
  return apiFetch<AppInfo>('/app-info', { signal })
}
