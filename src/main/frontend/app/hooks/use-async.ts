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
  const enabled = options?.enabled ?? true
  const key = options?.key

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const asyncFnRef = useRef(asyncFn)
  asyncFnRef.current = asyncFn

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController

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
        if (error_?.name === 'AbortError' || abortController.signal.aborted) return
        setError(error_ instanceof Error ? error_ : new Error(String(error_)))
        setIsLoading(false)
      })

    return () => {
      abortController.abort()
    }
  }, [enabled, key])

  const refetch = useCallback(() => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

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
        if (error_?.name === 'AbortError' || abortController.signal.aborted) return
        setError(error_ instanceof Error ? error_ : new Error(String(error_)))
        setIsLoading(false)
      })
  }, [])

  return { data, isLoading, error, refetch }
}
