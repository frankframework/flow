import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type JSX } from 'react'
import useToasts from '~/components/toast/use-toasts'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import { parseXsd } from '~/utils/xsd-utils'

type FrankConfigXsdContextValue = {
  xsdContent: string | null
  xsdDoc: Document | null
  error: Error | null
  refetch: () => void
}

const FrankConfigXsdContext = createContext<FrankConfigXsdContextValue | null>(null)

export function FrankConfigXsdProvider({ children }: { children: ReactNode }): JSX.Element {
  const [xsdContent, setXsdContent] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const { logApiWarning } = useToasts()

  const load = useCallback((): void => {
    setError(null)
    fetchFrankConfigXsd()
      .then(setXsdContent)
      .catch((error_): void => {
        setError(error_ as Error)
        logApiWarning('Failed to load FrankConfig XSD:', error_ as Error)
      })
  }, [logApiWarning])

  useEffect((): void => {
    load()
  }, [load])

  const xsdDocument = useMemo((): Document | null => (xsdContent ? parseXsd(xsdContent) : null), [xsdContent])

  return (
    <FrankConfigXsdContext.Provider value={{ xsdContent, xsdDoc: xsdDocument, error, refetch: load }}>
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
