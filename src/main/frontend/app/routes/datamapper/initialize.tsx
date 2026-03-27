import { type Dispatch, useState } from 'react'
import SourceDefinitionComponent from '~/components/datamapper/source-schema-definition'
import UploadImportButton from '~/components/datamapper/upload-import-button'
import Button from '~/components/inputs/button'
import Dropdown from '~/components/inputs/dropdown'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { DataTypeSchema } from '~/types/datamapper_types/data-types'
import datatypesJson from '~/utils/datamapper_utils/config/data-types.json'

interface InitializeProperties {
  config: MappingListConfig
  configDispatch: Dispatch<ConfigActions>
  confirmed: boolean
  setRoute: Dispatch<string>
}

function Initialize({ config, configDispatch, confirmed, setRoute }: InitializeProperties) {
  const datatypes: DataTypeSchema = datatypesJson as DataTypeSchema
  const [sources, setSources] = useState<number[]>([])
  const { sourceSchematics, targetSchematic } = useFile()

  const findDataType = (name: string) => datatypes.find((dataType) => dataType.name === name) ?? null

  // Dispatch functions that take the selected value as a string
  const configSourceDispatch = (value: string) =>
    configDispatch({ type: 'SET_SOURCE_FORMAT', payload: findDataType(value) })

  const configTargetDispatch = (value: string) =>
    configDispatch({ type: 'SET_TARGET_FORMAT', payload: findDataType(value) })

  const configConfirmDispatched = () => configDispatch({ type: 'SET_STAGE', payload: 'Schema_upload' })
  function toProperties() {
    setRoute('Properties')
    configDispatch({ type: 'SET_STAGE', payload: 'Mapping' })
  }

  return (
    <div className="space-y-6 p-4">
      {/* Import / Export Buttons */}
      <div
        className="flex w-full flex-col gap-3 md:flex-row md:gap-4"
        hidden={sourceSchematics.length === 0 || !targetSchematic}
      >
        <Button
          className="bg-foreground-active disabled:bg-backdrop disabled:text-foreground-muted flex-1 font-medium text-neutral-900 transition hover:brightness-110"
          onClick={toProperties}
        >
          To Next Step
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
            options={Object.fromEntries(datatypes.map((dataType) => [dataType.name, dataType.name]))}
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
            options={Object.fromEntries(datatypes.map((dataType) => [dataType.name, dataType.name]))}
            disabled={confirmed}
          />
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-center" hidden={confirmed}>
        <Button
          className="bg-foreground-active disabled:bg-backdrop disabled:text-foreground-muted font-medium text-neutral-900 transition hover:brightness-110"
          disabled={confirmed || !config.formatTypes.target || !config.formatTypes.source}
          onClick={configConfirmDispatched}
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
