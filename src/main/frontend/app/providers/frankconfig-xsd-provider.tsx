import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import { parseXsd } from '~/utils/xsd-utils'
import { logApiWarning } from '~/utils/logger'

type FrankConfigXsdContextValue = {
  xsdContent: string | null
  xsdDoc: Document | null
  error: Error | null
  refetch: () => void
}

const FrankConfigXsdContext = createContext<FrankConfigXsdContextValue | null>(null)

export function FrankConfigXsdProvider({ children }: { children: ReactNode }) {
  const [xsdContent, setXsdContent] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchFrankConfigXsd()
      .then(setXsdContent)
      .catch((error_) => {
        setError(error_ as Error)
        logApiWarning('Failed to load FrankConfig XSD:', error_ as Error)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const xsdDoc = useMemo(() => (xsdContent ? parseXsd(xsdContent) : null), [xsdContent])

  return (
    <FrankConfigXsdContext.Provider value={{ xsdContent, xsdDoc, error, refetch: load }}>
      {children}
    </FrankConfigXsdContext.Provider>
  )
}

export function useFrankConfigXsd(): FrankConfigXsdContextValue {
  const context = useContext(FrankConfigXsdContext)
  if (!context) {
    throw new Error('useFrankConfigXsd must be used within a FrankConfigXsdProvider')
  }
  return context
}
