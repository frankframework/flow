import React, { useEffect, useState } from 'react'
import { createConfigurationFile } from '~/services/configuration-file-service'
import { useProjectStore } from '~/stores/project-store'
import type { ConfigurationProject } from '~/types/project.types'
import Button from '~/components/inputs/button'
import CloseButton from '~/components/inputs/close-button'
import Input from '~/components/inputs/input'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import { fetchProject } from '~/services/project-service'
import { joinPath, relativeTo, SAFE_NAME_PATTERN } from '~/utils/path-utils'
import InputWithLabel from '~/components/inputs/input-with-label'
import ValidatedInput from '~/components/inputs/validatedInput'

type AddConfigurationModalProperties = {
  onClose: () => void
  onSuccess?: () => void
  currentConfiguration: ConfigurationProject
  configurationsDirPath?: string
}

export default function AddConfigurationFileModal({
  onClose,
  onSuccess,
  currentConfiguration,
  configurationsDirPath,
}: Readonly<AddConfigurationModalProperties>): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [isOpenPickerOpen, setIsOpenPickerOpen] = useState(false)
  const [rootLocationName, setRootLocationName] = useState('')
  const [isFilenameValid, setIsFilenameValid] = useState(false)
  const setProject = useProjectStore((s): ((project: ConfigurationProject) => void) => s.setProject)

  useEffect((): void => {
    setRootLocationName(configurationsDirPath ?? '')
  }, [configurationsDirPath])

  const handleAdd = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      let configname = filename.trim()

      if (!configname.toLowerCase().endsWith('.xml')) {
        configname += `.xml`
      }

      const relativeFolder = relativeTo(currentConfiguration.rootPath, rootLocationName)
      const relativePath = relativeFolder ? joinPath(relativeFolder, configname) : configname

      await createConfigurationFile(currentConfiguration.name, relativePath)
      const updatedProject = await fetchProject(currentConfiguration.name)
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

  const handleClose = (): void => {
    setFilename('')
    setRootLocationName('')
    setError(null)
    onClose()
  }

  const handleClickedOutside = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const handleDirectorySelect = (absolutePath: string): void => {
    setRootLocationName(absolutePath)
    setIsOpenPickerOpen(false)
  }

  const trimmedFilename = filename.trim()

  const displayFilename = ((): string => {
    if (!trimmedFilename) return ''
    return trimmedFilename.toLowerCase().endsWith('.xml') ? trimmedFilename : `${trimmedFilename}.xml`
  })()

  return (
    <div
      className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center"
      onClick={handleClickedOutside}
    >
      <div className="bg-background border-border relative h-100 w-1/3 min-w-200 rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add File</h2>
        <p className="mb-4">Add a new configuration file.</p>

        <div className="space-y-4">
          <InputWithLabel label="Location" htmlFor="configuration-filename-input" inputSide="right" grow={true}>
            <Input
              id="configuration-filename-input"
              aria-label="folder location"
              readOnly={true}
              onDoubleClick={(): void => setIsOpenPickerOpen(true)}
              value={rootLocationName || configurationsDirPath}
            />
            <Button onClick={(): void => setIsOpenPickerOpen(true)}>Browse...</Button>
          </InputWithLabel>

          <InputWithLabel grow={true} label="Filename" htmlFor="configuration-filename-input" inputSide="right">
            <ValidatedInput
              id="configuration-filename-input"
              value={filename}
              onChange={(event): void => setFilename(event.target.value)}
              placeholder="Choose a filename"
              aria-label="configuration filename"
              patterns={{
                'Filename cannot be empty': /^.+$/,
                'Filename may only contain letters, digits, spaces, and . _ - (no "..")': SAFE_NAME_PATTERN,
              }}
              onValidChange={(isValid): void => {
                setIsFilenameValid(isValid)
              }}
            />
            <span className="text-foreground-muted text-sm">.xml</span>
          </InputWithLabel>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAdd} disabled={loading || !isFilenameValid} className="disabled:opacity-50">
            {loading ? 'Adding...' : `Add ${displayFilename || 'configuration file'} to ${currentConfiguration.name}`}
          </Button>

          <CloseButton onClick={handleClose} className="absolute top-3 right-3" />
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
      {isOpenPickerOpen && (
        <DirectoryPicker
          onSelect={handleDirectorySelect}
          onCancel={(): void => setIsOpenPickerOpen(false)}
          rootLabel={currentConfiguration.rootPath}
          initialPath={rootLocationName === '' ? configurationsDirPath : rootLocationName}
        />
      )}
    </div>
  )
}
