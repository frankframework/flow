import { type Dispatch, type SetStateAction, useState, type ChangeEvent } from 'react'
import SourceDefinitionComponent from '~/components/datamapper/source-schema-definition'
import UploadImportButton from '~/components/datamapper/upload-import-button'
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

  const findDataType = (event: ChangeEvent<HTMLSelectElement>) =>
    datatypes.find((dataType) => dataType.name === event.target.value) ?? null

  const configSourceDispatch = (onChangeEvent: ChangeEvent<HTMLSelectElement>) =>
    configDispatch({ type: 'SET_SOURCE_FORMAT', payload: findDataType(onChangeEvent) })

  const configTargetDispatch = (onChangeEvent: ChangeEvent<HTMLSelectElement>) =>
    configDispatch({ type: 'SET_TARGET_FORMAT', payload: findDataType(onChangeEvent) })

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
        <button
          className="border-border bg-backdrop text-foreground hover:bg-hover active:bg-selecteds flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition"
          onClick={handleManualExport}
        >
          Export Configuration
        </button>
      </div>

      {/* Source & Target type Selection */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Source */}
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-foreground text-lg font-semibold">Source</h2>
          <label htmlFor="sourceType" className="text-foreground-muted text-sm">
            Type:
          </label>
          <select
            id="sourceType"
            className="border-border text-foreground bg-background w-full rounded-xl border p-2 text-sm focus:outline-none"
            value={config.formatTypes?.source?.name || ''}
            disabled={confirmed}
            onChange={configSourceDispatch}
          >
            <option value="">Select source datatype</option>
            {datatypes.map((dt) => (
              <option key={dt.name} value={dt.name}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target */}
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-foreground text-lg font-semibold">Target</h2>
          <label htmlFor="targetType" className="text-foreground-muted text-sm">
            Type:
          </label>
          <select
            id="targetType"
            className="border-border text-foreground bg-background w-full rounded-xl border p-2 text-sm focus:outline-none"
            value={config.formatTypes?.target?.name || ''}
            disabled={confirmed}
            onChange={configTargetDispatch}
          >
            <option value="">Select target datatype</option>
            {datatypes.map((dt) => (
              <option key={dt.name} value={dt.name}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-center" hidden={confirmed}>
        <button
          className="border-border bg-foreground-active disabled:bg-backdrop disabled:text-foreground-muted rounded-2xl border px-6 py-3 font-medium text-[var(--color-neutral-900)] transition hover:brightness-110"
          disabled={confirmed || !config.formatTypes.target || !config.formatTypes.source}
          onClick={() => setConfirmed(true)}
        >
          Confirm types
        </button>
      </div>

      {/* Extra source section */}
      {confirmed && (
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Source Section */}
          <div className="flex flex-1 flex-col gap-4">
            <UploadImportButton label="Import Schema" flowType="source" config={config} disabled={!confirmed} />
            <button
              onClick={() => setSources((previous) => [...previous, (previous.at(-1) || 0) + 1])}
              className="border-border bg-background text-foreground hover:bg-hover w-full rounded-xl border px-4 py-2.5 font-medium transition"
            >
              Add Extra Schema
            </button>
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
