import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAsyncOptions {
  enabled?: boolean
  key?: string | number | null
}

interface UseAsyncResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useAsync<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  options?: UseAsyncOptions,
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const asyncFnRef = useRef(asyncFn)
  asyncFnRef.current = asyncFn

  const enabled = options?.enabled ?? true
  const key = options?.key

  const execute = useCallback((abortController: AbortController) => {
    setIsLoading(true)
    setError(null)

    asyncFnRef
      .current(abortController.signal)
      .then((result) => {
        if (!abortController.signal.aborted) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((error_) => {
        if (error_.name === 'AbortError' || abortController.signal.aborted) return
        setError(error_ instanceof Error ? error_ : new Error(String(error_)))
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const timeoutId = setTimeout(() => {
      if (!cancelled) execute(abortController)
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [enabled, key, execute])

  const refetch = () => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    execute(abortController)
  }

  return { data, isLoading, error, refetch }
}
