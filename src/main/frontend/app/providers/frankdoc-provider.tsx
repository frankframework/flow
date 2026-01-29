import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { FFDoc, ElementDetails, Filters } from '@frankframework/ff-doc'
import { fetchFrankDoc } from '~/services/frankdoc-service'

interface FrankDocContextValue {
  ffDoc: FFDoc | null
  elements: Record<string, ElementDetails> | null
  filters: Filters | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const FrankDocContext = createContext<FrankDocContextValue | null>(null)

export function FrankDocProvider({ children }: { children: ReactNode }) {
  const [ffDoc, setFfDoc] = useState<FFDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchFrankDoc(signal)
      if (!signal?.aborted) {
        setFfDoc(data)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (!signal?.aborted) {
        setError(err instanceof Error ? err : new Error('Failed to load FrankDoc'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const elements = ffDoc?.elements ?? null
  const filters = ffDoc?.filters ?? null

  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  const contextValue = useMemo(
    () => ({ ffDoc, elements, filters, isLoading, error, refetch }),
    [ffDoc, elements, filters, isLoading, error, refetch]
  )

  return (
    <FrankDocContext.Provider value={contextValue}>
      {children}
    </FrankDocContext.Provider>
  )
}

export function useFrankDoc(): FrankDocContextValue {
  const context = useContext(FrankDocContext)
  if (!context) {
    throw new Error('useFrankDoc must be used within a FrankDocProvider')
  }
  return context
}
