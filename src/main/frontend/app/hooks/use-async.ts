import { useCallback, useEffect, useRef, useState } from 'react'

type UseAsyncOptions = {
  enabled?: boolean
  key?: string | number | null
}

type UseAsyncResult<T> = {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useAsync<T>(
  asyncFunction: (signal: AbortSignal) => Promise<T>,
  options?: UseAsyncOptions,
): UseAsyncResult<T> {
  const enabled = options?.enabled ?? true
  const key = options?.key

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const asyncFunctionReference = useRef(asyncFunction)
  asyncFunctionReference.current = asyncFunction

  const abortControllerReference = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled) return

    const abortController = new AbortController()
    abortControllerReference.current = abortController

    setIsLoading(true)
    setError(null)

    asyncFunctionReference
      .current(abortController.signal)
      .then((result) => {
        if (abortController.signal.aborted) {
          return
        }

        setData(result)
        setIsLoading(false)
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
    abortControllerReference.current?.abort()
    const abortController = new AbortController()
    abortControllerReference.current = abortController

    setIsLoading(true)
    setError(null)

    asyncFunctionReference
      .current(abortController.signal)
      .then((result) => {
        if (abortController.signal.aborted) {
          return
        }

        setData(result)
        setIsLoading(false)
      })
      .catch((error_) => {
        if (error_?.name === 'AbortError' || abortController.signal.aborted) return
        setError(error_ instanceof Error ? error_ : new Error(String(error_)))
        setIsLoading(false)
      })
  }, [])

  return { data, isLoading, error, refetch }
}
