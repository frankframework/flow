import variables from '../../environment/environment'

export function apiUrl(path: string): string {
  return `${variables.apiBaseUrl}/api${path}`
}
