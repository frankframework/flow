import React, { useEffect, useState } from 'react'
import { createConfiguration } from '~/services/configuration-service'
import { useProjectStore } from '~/stores/project-store'
import type { Project } from '~/types/project.types'
import Button from '~/components/inputs/button'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import { fetchProject } from '~/services/project-service'

interface AddConfigurationModalProperties {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentProject?: Project
  configurationsDirPath?: string
}

export default function AddConfigurationModal({
  isOpen,
  onClose,
  onSuccess,
  currentProject,
  configurationsDirPath,
}: Readonly<AddConfigurationModalProperties>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [isOpenPickerOpen, setIsOpenPickerOpen] = useState(false)
  const [rootLocationName, setRootLocationName] = useState('')
  const setProject = useProjectStore((s) => s.setProject)

  useEffect(() => {
    setRootLocationName(configurationsDirPath ?? '')
  }, [configurationsDirPath])

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

      await createConfiguration(currentProject.name, `${rootLocationName}/${configname}`)
      const updatedProject = await fetchProject(currentProject.name)
      setProject(updatedProject)
      onSuccess?.()
      setRootLocationName('')
      onClose()
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : 'Failed to add configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFilename('')
    setRootLocationName('')
    setError(null)
    onClose()
  }

  const handleClickedOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const handleDirectorySelect = (absolutePath: string) => {
    setRootLocationName(absolutePath)
    setIsOpenPickerOpen(false)
  }

  const displayFilename = (() => {
    const trimmed = filename.trim()
    if (!trimmed) return ''
    return trimmed.toLowerCase().endsWith('.xml') ? trimmed : `${trimmed}.xml`
  })()

  return (
    <div
      className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center"
      onClick={handleClickedOutside}
    >
      <div className="bg-background border-border relative h-100 w-1/3 min-w-200 rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Configuration</h2>
        <p className="mb-4">Add a new configuration file.</p>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="configuration-filename-input">
            Location
          </label>
          <div className="ml-2 flex w-full items-center">
            <label
              className="border-border bg-background w-full rounded border px-2 py-1 text-sm transition"
              aria-label="folder location"
              onDoubleClick={() => setIsOpenPickerOpen(true)}
            >
              {rootLocationName || configurationsDirPath}
            </label>
          </div>
          <Button onClick={() => setIsOpenPickerOpen(true)} className="ml-2 h-8 text-sm">
            Browse...
          </Button>
        </div>

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
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAdd} disabled={loading} className="disabled:opacity-50">
            {loading ? 'Adding...' : `Add ${displayFilename || 'configuration'} to ${currentProject.name}`}
          </Button>

          <Button onClick={handleClose} className="absolute top-3 right-3">
            Close
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
      <DirectoryPicker
        isOpen={isOpenPickerOpen}
        onSelect={handleDirectorySelect}
        onCancel={() => setIsOpenPickerOpen(false)}
        rootLabel={currentProject.rootPath}
        initialPath={rootLocationName === '' ? configurationsDirPath : rootLocationName}
      />
    </div>
  )
}
