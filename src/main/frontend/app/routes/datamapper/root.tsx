import { useEffect, useReducer, useState } from 'react'

import PropertyList from './property-list'
import { showInfoToast, showSuccessToast } from '~/components/toast'
import ToggleThemeButton from '~/components/datamapper/toggle-theme-button'
import {
  DEFAULT_MAPPING_LIST_CONFIG,
  mappingListConfigReducer,
} from '~/stores/datamapper_state/mappingListConfig/reducer'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { FLOW_KEY } from '~/utils/datamapper_utils/const'
import { convertMappingConfigToMappingFile } from '~/utils/datamapper_utils/convert-node-utils'
import AdvancedEditor from './advanced-editor'
import Initialize from './initialize'
import MappingTable from './mapping-table'
import { ReactFlowProvider } from '@xyflow/react'
import { FileProvider } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Button from '~/components/inputs/button'
import { saveDatamapperConfiguration, fetchDatamapperConfiguration } from '~/services/datamapper-service'
import { useProjectStore } from '~/stores/project-store'

export default function Root() {
  const [route, setRoute] = useState('Initialize')
  const routes = ['Initialize', 'Properties', 'Mappings', 'Advanced']
  const project = useProjectStore.getState().project

  const [mappingListConfig, dispatchMappingListConfig] = useReducer(
    mappingListConfigReducer,
    DEFAULT_MAPPING_LIST_CONFIG,
  )

  useEffect(() => {
    const loadConfig = async () => {
      if (project) {
        const config = await fetchDatamapperConfiguration(project.name)
        console.dir(config)
        console.log('test')

        dispatchMappingListConfig({
          type: 'IMPORT_CONFIG',
          payload: config,
        })
      }
    }

    loadConfig()
  }, [])

  const handleManualConfigExport = () => {
    const dataString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mappingListConfig))}`
    const link = document.createElement('a')
    link.href = dataString
    link.download = 'flow_configuration.json'
    link.click()
  }

  const [confirmed, setConfirmed] = useState<boolean>(!!localStorage.getItem(FLOW_KEY))

  useEffect(() => {
    const timeout = setTimeout(async () => {
      localStorage.setItem(FLOW_KEY, JSON.stringify(mappingListConfig))
      if (!project || !mappingListConfig.formatTypes.source || !mappingListConfig.formatTypes.target) {
        return
      }
      await saveDatamapperConfiguration(project?.name, JSON.stringify(mappingListConfig))
    }, 300)
    return () => clearTimeout(timeout)
  }, [mappingListConfig])

  return (
    <ReactFlowProvider>
      <FileProvider>
        {/* These buttons only exists for testing purposes, ignore the styling on these, they will be removed in later stages */}
        <div className="top fixed right-0 z-60 gap-2">
          <ToggleThemeButton />

          <button
            className="border-border hover:bg-hover active:bg-selected w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={() => {
              console.dir(mappingListConfig)
              showSuccessToast('Logging config to console!', 'Debug')
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
        <div className="bg-backdrop inset-0 z-50 h-full items-center justify-center p-4">
          <div className="bg-background text-foreground rounded-lg shadow-lg">
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
            <div className="w-full overflow-auto p-4" style={{ maxHeight: 'calc(96vh - 93px)' }}>
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
      </FileProvider>
    </ReactFlowProvider>
  )
}
