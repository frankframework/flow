import variables from '../../environment/environment'

export function apiUrl(path: string): string {
  return `${variables.apiBaseUrl}/api${path}`
}

const getAnonymousSessionId = () => {
  const STORAGE_KEY = 'frankflow_anon_session_id'
  let id = sessionStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

const getAuthToken = () => {
  return localStorage.getItem('access_token') || null
}

interface BackendErrorResponse {
  httpStatus: number
  messages: string[]
  errorCode: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public messages?: string[],
    public errorCode?: string,
  ) {
    super(messages ? messages.join(', ') : status.toString())
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData

  const defaultHeaders: Record<string, string> =
    options?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}

  const headers: Record<string, string> = {
    ...defaultHeaders,
    'X-Session-ID': getAnonymousSessionId(),
    ...(options?.headers as Record<string, string>),
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  })

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
