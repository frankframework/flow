import variables from '../../environment/environment'

export function apiUrl(path: string): string {
  return `${variables.apiBaseUrl}/api${path}`
}

interface BackendErrorResponse {
  httpStatus: number
  messages: string[]
  errorCode: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
    public errorCode?: string,
  ) {
    super(messages.join(', '))
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = options?.body ? { 'Content-Type': 'application/json' } : {}

  const response = await fetch(apiUrl(path), { ...options, headers: { ...headers, ...options?.headers } })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const error: BackendErrorResponse = await response.json()
      throw new ApiError(error.httpStatus, error.messages, error.errorCode)
    }
    throw new ApiError(response.status, [response.statusText])
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }

  return undefined as T
}
