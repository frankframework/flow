import { type Dispatch, type SetStateAction, useState } from 'react'
import SourceDefinitionComponent from '~/components/datamapper/source-schema-definition'
import UploadImportButton from '~/components/datamapper/upload-import-button'
import Button from '~/components/inputs/button'
import Dropdown from '~/components/inputs/dropdown'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { DataTypeSchema } from '~/types/datamapper_types/data-types'
import datatypesJson from '~/utils/datamapper_utils/data-types.json'

interface InitializeProperties {
  config: MappingListConfig
  configDispatch: Dispatch<ConfigActions>
  confirmed: boolean
  setConfirmed: Dispatch<SetStateAction<boolean>>
}

function Initialize({ config, configDispatch, confirmed, setConfirmed }: InitializeProperties) {
  const datatypes: DataTypeSchema = datatypesJson as DataTypeSchema
  const [sources, setSources] = useState<number[]>([])

  const findDataType = (name: string) => datatypes.find((dataType) => dataType.name === name) ?? null

  // Dispatch functions that take the selected value as a string
  const configSourceDispatch = (value: string) =>
    configDispatch({ type: 'SET_SOURCE_FORMAT', payload: findDataType(value) })

  const configTargetDispatch = (value: string) =>
    configDispatch({ type: 'SET_TARGET_FORMAT', payload: findDataType(value) })

  // Manual export
  const handleManualExport = () => {
    const dataString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config))}`
    const link = document.createElement('a')
    link.href = dataString
    link.download = 'flow_configuration.json'
    link.click()
  }

  return (
    <div className="space-y-6 p-4">
      {/* Import / Export Buttons */}
      <div className="flex w-full flex-col gap-3 md:flex-row md:gap-4">
        <div className="flex-1">
          <UploadImportButton label="Import Configuration" configDispatch={configDispatch} />
        </div>
        <Button className="flex-1" onClick={handleManualExport}>
          Export Configuration
        </Button>
      </div>

      {/* Source & Target type Selection */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Source */}
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-foreground text-lg font-semibold">Source</h2>
          <label htmlFor="sourceType" className="text-foreground-muted text-sm">
            Type:
          </label>
          <Dropdown
            value={config.formatTypes?.source?.name || ''}
            onChange={configSourceDispatch}
            options={Object.fromEntries(datatypes.map((dt) => [dt.name, dt.name]))}
            disabled={confirmed}
          />
        </div>

        {/* Target */}
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-foreground text-lg font-semibold">Target</h2>
          <label htmlFor="targetType" className="text-foreground-muted text-sm">
            Type:
          </label>
          <Dropdown
            value={config.formatTypes?.target?.name || ''}
            onChange={configTargetDispatch}
            options={Object.fromEntries(datatypes.map((dt) => [dt.name, dt.name]))}
            disabled={confirmed}
          />
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-center" hidden={confirmed}>
        <Button
          className="bg-foreground-active disabled:bg-backdrop disabled:text-foreground-muted font-medium text-[var(--color-neutral-900)] transition hover:brightness-110"
          disabled={confirmed || !config.formatTypes.target || !config.formatTypes.source}
          onClick={() => setConfirmed(true)}
        >
          Confirm types
        </Button>
      </div>

      {/* Extra source section */}
      {confirmed && (
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Source Section */}
          <div className="flex flex-1 flex-col gap-4">
            <UploadImportButton label="Import Schema" flowType="source" config={config} disabled={!confirmed} />
            <Button onClick={() => setSources((previous) => [...previous, (previous.at(-1) || 0) + 1])}>
              Add Extra Schema
            </Button>
            {sources.length > 0 && (
              <div className="max-h-[60vh] overflow-auto rounded-xl p-2">
                {sources.map((id) => (
                  <SourceDefinitionComponent
                    key={id}
                    config={config}
                    onDelete={() => setSources(sources.filter((item) => item !== id))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Target Section */}
          <div className="flex flex-1 flex-col gap-4">
            <UploadImportButton label="Import Schema" flowType="target" config={config} disabled={!confirmed} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Initialize
