import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { FFDoc, ElementDetails, Filters } from '@frankframework/ff-doc'
import { fetchFrankDoc } from '~/services/frankdoc-service'

interface FrankDocContextValue {
  ffDoc: FFDoc | null
  elements: Record<string, ElementDetails> | null
  filters: Filters | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const FrankDocContext = createContext<FrankDocContextValue | null>(null)

export function FrankDocProvider({ children }: { children: ReactNode }) {
  const [ffDoc, setFfDoc] = useState<FFDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadFrankDoc = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchFrankDoc()
      setFfDoc(data)
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFrankDoc()
  }, [])

  const elements = ffDoc?.elements ?? null
  const filters = ffDoc?.filters ?? null

  return (
    <FrankDocContext.Provider value={{ ffDoc, elements, filters, isLoading, error, refetch: loadFrankDoc }}>
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
