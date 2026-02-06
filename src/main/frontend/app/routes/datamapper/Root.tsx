import { useEffect, useReducer, useState } from 'react'

import PropertyList from './property-list'
import { showInfoToast, Toast } from '~/components/datamapper/Toast'
import ToggleThemeButton from '~/components/datamapper/toggle-theme-button'
import {
  DEFAULT_MAPPING_LIST_CONFIG,
  mappingListConfigReducer,
} from '~/stores/datamapper_state/mappingListConfig/reducer'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { FLOW_KEY } from '~/utils/datamapper_utils/const'
import { convertMappingConfigToMappingFile } from '~/utils/datamapper_utils/utils'
import AdvancedEditor from './advanced-editor'
import Initialize from './Initialize'
import MappingTable from './mapping-table'
import { ReactFlowProvider } from '@xyflow/react'
import { FileProvider } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Button from '~/components/inputs/button'

function Root() {
  const [route, setRoute] = useState('Initialize')
  const routes = ['Initialize', 'Properties', 'Mappings', 'Advanced']

  const initMappingListConfig = (): MappingListConfig => {
    const stored = localStorage.getItem(FLOW_KEY)
    return stored ? (JSON.parse(stored) as MappingListConfig) : DEFAULT_MAPPING_LIST_CONFIG
  }

  const [mappingListConfig, dispatchMappingListConfig] = useReducer(
    mappingListConfigReducer,
    undefined,
    initMappingListConfig,
  )
  const handleManualConfigExport = () => {
    const dataString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mappingListConfig))}`
    const link = document.createElement('a')
    link.href = dataString
    link.download = 'flow_configuration.json'
    link.click()
  }

  const [confirmed, setConfirmed] = useState<boolean>(!!localStorage.getItem(FLOW_KEY))

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(FLOW_KEY, JSON.stringify(mappingListConfig))
    }, 300)
    return () => clearTimeout(timeout)
  }, [mappingListConfig])

  return (
    <ReactFlowProvider>
      <FileProvider>
        <div className="top fixed right-0 z-60 gap-2">
          <ToggleThemeButton />

          <button
            className="border-border hover:bg-hover active:bg-selected w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={() => {
              console.dir(mappingListConfig)
              showInfoToast('Logging config to console!', 'Debug')
            }}
          >
            Test External node log
          </button>
          <button
            className="border-border hover:bg-hover active:bg-selected hidden w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={() => {
              const dataString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(convertMappingConfigToMappingFile(mappingListConfig)),
              )}`
              const link = document.createElement('a')
              link.href = dataString
              link.download = 'mapping-file.json'
              link.click()
              showInfoToast('Downloading file!', 'Debug')
            }}
          >
            Export as final mappingFile
          </button>
          <button
            className="border-border hover:bg-hover active:bg-selected w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={handleManualConfigExport}
          >
            Export configuration
          </button>
          <button
            className="border-border hover:bg-hover active:bg-selected w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={() => {
              localStorage.clear()
              globalThis.location.reload()
            }}
          >
            RESET
          </button>
        </div>

        {/* Center modal/container */}
        <div className="bg-selected inset-0 z-50 h-full items-center justify-center p-4">
          <div className="text-foreground rounded-lg shadow-lg">
            {/* Header */}
            <div className="border-b-border box-border h-10 w-full rounded-t-md border-b bg-[radial-gradient(ellipse_farthest-corner_at_20%_20%,var(--type-pipe)_0%,var(--color-background)_100%)] p-2 text-lg font-semibold">
              Mapping (mappingName)
            </div>

            {/* Route buttons */}
            <div className="my-3 flex h-10 w-full gap-4 px-4">
              {routes.map((routeName) => (
                <Button
                  key={routeName}
                  disabled={routeName !== 'Initialize' && !confirmed}
                  className="flex-1"
                  onClick={() => setRoute(routeName)}
                >
                  {routeName}
                </Button>
              ))}
            </div>

            {/* Main content */}
            <div className="w-full overflow-auto p-4" style={{ maxHeight: 'calc(90vh - 10px - 46px - 16px)' }}>
              {route === 'Initialize' && (
                <Initialize
                  config={mappingListConfig}
                  configDispatch={dispatchMappingListConfig}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                />
              )}
              {route === 'Properties' && (
                <PropertyList config={mappingListConfig} configDispatch={dispatchMappingListConfig} />
              )}
              {route === 'Mappings' && (
                <MappingTable config={mappingListConfig} configDispatch={dispatchMappingListConfig} />
              )}
              {route === 'Advanced' && <AdvancedEditor />}
            </div>
          </div>
        </div>

        <Toast />
      </FileProvider>
    </ReactFlowProvider>
  )
}

export default Root
