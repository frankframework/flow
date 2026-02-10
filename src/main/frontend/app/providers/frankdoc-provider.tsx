import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useFFDoc } from '@frankframework/ff-doc/react'
import type { Elements, Filters, FFDocJson } from '@frankframework/ff-doc'
import { apiUrl } from '~/utils/api'

interface FrankDocContextValue {
  ffDoc: FFDocJson | null
  elements: Elements | null
  filters: Filters | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const FrankDocContext = createContext<FrankDocContextValue | null>(null)

export function FrankDocProvider({ children }: { children: ReactNode }) {
  const { ffDoc, elements, filters } = useFFDoc(apiUrl('/json/frankdoc'))

  const isLoading = ffDoc === null
  const error = null

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const refetch = () => {
    globalThis.location.reload()
  }

  const contextValue = useMemo(
    () => ({ ffDoc, elements, filters, isLoading, error, refetch }),
    [ffDoc, elements, filters, isLoading],
  )

  return <FrankDocContext.Provider value={contextValue}>{children}</FrankDocContext.Provider>
}

export function useFrankDoc(): FrankDocContextValue {
  const context = useContext(FrankDocContext)
  if (!context) {
    throw new Error('useFrankDoc must be used within a FrankDocProvider')
  }
  return context
}
