export function apiUrl(path: string): string {
  return `/api${path}`
}

const getAnonymousSessionId = (): string => {
  const STORAGE_KEY = 'frankflow_anon_session_id'
  let id = sessionStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('access_token') || null
}

type BackendErrorResponse = {
  status: string
  error: string
}

export class ApiError extends Error {
  constructor(
    public status: string,
    public error: string,
    public httpCode: number,
  ) {
    super(error)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
    'X-Session-ID': getAnonymousSessionId(),
  }
  if (!isFormData && options?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  if (options?.method && !['GET', 'HEAD', 'OPTIONS'].includes(options?.method)) {
    const xsrfToken = getCookie('XSRF-TOKEN')
    if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    /*
     * credentials is a requirement for csrf according to multiple sources, but seems to work fine without it ??
     * It also breaks because of our CORS configuration which will result in
     * "credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"
     */
    // credentials: 'include',
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const error: BackendErrorResponse = await response.json()
      throw new ApiError(error.status, error.error, response.status)
    }
    throw new ApiError('Server Error', `HTTP ${response.status} - ${response.statusText}`, response.status)
  }

  const contentType = response.headers.get('content-type')
  const contentLength = response.headers.get('content-length')
  const hasNoBody = response.status === 204 || contentLength === '0'
  if (hasNoBody || !contentType?.includes('application/json')) {
    // a little dirty but allows void to be returned without breaking the generic type constraint
    return undefined as T
  }
  return response.json()
}

function getCookie(name: string): string | undefined {
  const cookieKV = document.cookie.match(String.raw`(^|;)\s*${name}\s*=\s*([^;]+)`)
  return cookieKV ? cookieKV.pop() : ''
}
