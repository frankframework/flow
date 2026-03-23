import { type ChangeEvent, type Dispatch, useId } from 'react'

import clsx from 'clsx'
import type { useFlowManagement } from '~/hooks/use-datamapper-flow-management'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { MappingListConfig } from '~/types/datamapper_types/export-types'
import { FLOW_KEY } from '~/utils/datamapper_utils/const'
import { showErrorToast, showSuccessToast } from '../toast'

interface SchemaUploadButtonProperties {
  label: string
  flowType?: 'source' | 'target'
  configDispatch?: Dispatch<ConfigActions>
  flow?: ReturnType<typeof useFlowManagement>
  config?: MappingListConfig
  name?: string
  disabled?: boolean
}

// Generic import button with visual feedback for uploaded files
function UploadImportButton({
  label,
  flowType,
  configDispatch,
  config,
  name,
  disabled = false,
}: SchemaUploadButtonProperties) {
  const { sourceSchematics, addSourceSchematic, targetSchematic, setTargetSchematic } = useFile()

  const inputId = `UploadImportButton${useId()}`

  // Determine the uploaded file name (for source/target)
  const uploadedFileName = (() => {
    if (!flowType) return null

    if (flowType === 'source') {
      const match = sourceSchematics?.find((s) => s.name === name)
      return match?.file?.name ?? null
    }

    if (flowType === 'target') {
      return targetSchematic?.name ?? null
    }

    return null
  })()

  const isUploaded = Boolean(uploadedFileName)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return // prevent any action if disabled
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (!flowType && configDispatch) {
        const text = await file.text()
        const parsed = JSON.parse(text)
        configDispatch({
          type: 'IMPORT_CONFIG',
          payload: parsed as MappingListConfig,
        })
        localStorage.setItem(FLOW_KEY, text)

        showSuccessToast('Imported config JSON!')
      } else if (flowType) {
        if (flowType === 'source') {
          addSourceSchematic({ file, name: name })
          showSuccessToast(`Added ${file.name} to source schematics`)
        } else if (flowType === 'target') {
          setTargetSchematic(file)
          showSuccessToast(`Target schematic set: ${file.name}`)
        }
      } else {
        showErrorToast('Invalid import!', 'Import failed!')
      }
    } catch {
      showErrorToast('Invalid json file!', 'Import failed')
    }

    event.target.value = ''
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <label
        htmlFor={inputId}
        className={clsx(
          'w-full cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors',
          disabled && 'cursor-not-allowed border-gray-300 bg-gray-300 text-gray-500',
          !disabled && isUploaded && 'border-green-600 bg-green-600 text-white hover:bg-green-500',
          !disabled && !isUploaded && 'border-border bg-backdrop text-foreground hover:bg-hover active:bg-selected',
        )}
      >
        {isUploaded ? (
          <span className="flex flex-col items-center gap-1 truncate">
            <span className="text-xs opacity-80">Uploaded</span>
            <span className="max-w-full truncate">{uploadedFileName}</span>
          </span>
        ) : (
          label
        )}
      </label>

      <input
        id={inputId}
        type="file"
        disabled={disabled}
        accept={config && flowType ? config?.formatTypes[flowType]?.schemaFileExtension : '.json'}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

export default UploadImportButton
