import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import { parseXsd } from '~/utils/xsd-utils'
import { logApiWarning } from '~/utils/logger'

type FrankConfigXsdContextValue = {
  xsdContent: string | null
  xsdDoc: Document | null
}

const FrankConfigXsdContext = createContext<FrankConfigXsdContextValue | null>(null)

export function FrankConfigXsdProvider({ children }: { children: ReactNode }) {
  const [xsdContent, setXsdContent] = useState<string | null>(null)

  useEffect(() => {
    fetchFrankConfigXsd()
      .then(setXsdContent)
      .catch((error) => logApiWarning('Failed to load FrankConfig XSD:', error as Error))
  }, [])

  const xsdDoc = useMemo(() => (xsdContent ? parseXsd(xsdContent) : null), [xsdContent])

  return <FrankConfigXsdContext.Provider value={{ xsdContent, xsdDoc }}>{children}</FrankConfigXsdContext.Provider>
}

export function useFrankConfigXsd(): FrankConfigXsdContextValue {
  const context = useContext(FrankConfigXsdContext)
  if (!context) {
    throw new Error('useFrankConfigXsd must be used within a FrankConfigXsdProvider')
  }
  return context
}
