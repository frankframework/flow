import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchFrankConfigXsd } from '~/services/xsd-service'

interface FrankConfigXsdContextValue {
  xsdContent: string | null
}

const FrankConfigXsdContext = createContext<FrankConfigXsdContextValue | null>(null)

export function FrankConfigXsdProvider({ children }: { children: ReactNode }) {
  const [xsdContent, setXsdContent] = useState<string | null>(null)

  useEffect(() => {
    fetchFrankConfigXsd()
      .then(setXsdContent)
      .catch((error) => console.error('Failed to load FrankConfig XSD:', error))
  }, [])

  return <FrankConfigXsdContext.Provider value={{ xsdContent }}>{children}</FrankConfigXsdContext.Provider>
}

export function useFrankConfigXsd(): FrankConfigXsdContextValue {
  const context = useContext(FrankConfigXsdContext)
  if (!context) {
    throw new Error('useFrankConfigXsd must be used within a FrankConfigXsdProvider')
  }
  return context
}
