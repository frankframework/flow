import { useState } from 'react'
import { useProjectStore } from '~/stores/project-store'
import { createConfiguration } from '~/services/configuration-service'
import type { Project } from '~/types/project.types'
import Button from '~/components/inputs/button'

interface AddConfigurationModalProperties {
  isOpen: boolean
  onClose: () => void
  currentProject?: Project
}

export default function AddConfigurationModal({
  isOpen,
  onClose,
  currentProject,
}: Readonly<AddConfigurationModalProperties>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const setProject = useProjectStore((s) => s.setProject)

  if (!isOpen || !currentProject) return null

  const handleAdd = async () => {
    setLoading(true)
    setError(null)

    try {
      let configname = filename.trim()
      if (!configname) {
        setError('Configuration name cannot be empty')
        setLoading(false)
        return
      }
      // Ensure .xml suffix
      if (!configname.toLowerCase().endsWith('.xml')) {
        configname = `${configname}.xml`
      }

      const updatedProject = await createConfiguration(currentProject.name, configname)
      setProject(updatedProject)
      onClose()
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : 'Failed to add configuration')
    } finally {
      setLoading(false)
    }
  }

  const displayFilename = (() => {
    const trimmed = filename.trim()
    if (!trimmed) return ''
    return trimmed.toLowerCase().endsWith('.xml') ? trimmed : `${trimmed}.xml`
  })()

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Configuration</h2>
        <p className="mb-4">Add a new configuration file.</p>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="configuration-filename-input">
            Filename
          </label>
          <div className="ml-2 flex w-full items-center">
            <input
              id="configuration-filename-input"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
              placeholder="Choose a filename"
              aria-label="configuration filename"
            />
            <span className="text-muted-foreground ml-2 text-sm">.xml</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAdd} disabled={loading} className="disabled:opacity-50">
            {loading ? 'Adding...' : `Add ${displayFilename || 'configuration'} to ${currentProject.name}`}
          </Button>

          <Button onClick={onClose} className="absolute top-3 right-3">
            Close
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
