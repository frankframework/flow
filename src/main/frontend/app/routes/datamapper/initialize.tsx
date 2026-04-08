import { type Dispatch } from 'react'
import Button from '~/components/inputs/button'
import Dropdown from '~/components/inputs/dropdown'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
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
          onClick={() => {
            configConfirmDispatched()
            toProperties()
          }}
        >
          Confirm types
        </Button>
      </div>
    </div>
  )
}

export default Initialize
