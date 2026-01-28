import { createContext, useContext, type ReactNode } from 'react'
import type { FFDoc, ElementDetails, Filters } from '@frankframework/ff-doc'
import { fetchFrankDoc } from '~/services/frankdoc-service'
import { useAsync } from '~/hooks/use-async'

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
  const { data: ffDoc, isLoading, error, refetch } = useAsync((signal) => fetchFrankDoc(signal), [])

  const elements = ffDoc?.elements ?? null
  const filters = ffDoc?.filters ?? null

  return (
    <FrankDocContext.Provider value={{ ffDoc, elements, filters, isLoading, error, refetch }}>
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
