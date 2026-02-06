import { createContext, useState, useContext, type ReactNode } from 'react'

export interface SourceSchematic {
  file: File
  name?: string
}

export interface FileContextType {
  sourceSchematics: SourceSchematic[]
  targetSchematic: File | null
  addSourceSchematic: (schematic: SourceSchematic) => void
  setTargetSchematic: (file: File | null) => void
  clearFiles: () => void
  deleteSourceSchema: (name: string) => void
}

const FileContext = createContext<FileContextType | undefined>(undefined)

interface FileProviderProperties {
  children: ReactNode
}

export const FileProvider = ({ children }: FileProviderProperties) => {
  const [sourceSchematics, setSourceSchematics] = useState<SourceSchematic[]>([])
  const [targetSchematic, setTargetSchematic] = useState<File | null>(null)

  const addSourceSchematic = (schematic: SourceSchematic) => {
    setSourceSchematics((previous) => {
      // Filter out any existing schematic with the same name
      const filtered = previous.filter((s) => s.name !== schematic.name)
      // Add the new schematic
      return [...filtered, schematic]
    })
  }
  const clearFiles = () => {
    setSourceSchematics([])
    setTargetSchematic(null)
  }

  const deleteSourceSchema = (name: string) => {
    setSourceSchematics(sourceSchematics.filter((item) => item.name != name))
  }

  return (
    <FileContext.Provider
      value={{
        sourceSchematics,
        targetSchematic,
        addSourceSchematic,
        setTargetSchematic,
        deleteSourceSchema,
        clearFiles,
      }}
    >
      {children}
    </FileContext.Provider>
  )
}

export const useFile = (): FileContextType => {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error('useFile must be used within a FileProvider')
  }
  return context
}
