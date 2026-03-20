import { useEffect, useReducer, useState } from 'react'

import PropertyList from './property-list'
import { showErrorToast, showSuccessToast } from '~/components/toast'
import {
  DEFAULT_MAPPING_LIST_CONFIG,
  mappingListConfigReducer,
} from '~/stores/datamapper_state/mappingListConfig/reducer'

import AdvancedEditor from './advanced-editor'
import Initialize from './initialize'
import MappingTable from './mapping-table'
import { ReactFlowProvider } from '@xyflow/react'
import { FileProvider } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Button from '~/components/inputs/button'
import { saveDatamapperConfiguration, fetchDatamapperConfiguration } from '~/services/datamapper-service'
import { useProjectStore } from '~/stores/project-store'

export default function Root() {
  const routes = ['Initialize', 'Properties', 'Mappings', 'Advanced']

  const project = useProjectStore.getState().project

  const [mappingListConfig, dispatchMappingListConfig] = useReducer(
    mappingListConfigReducer,
    DEFAULT_MAPPING_LIST_CONFIG,
  )
  const [route, setRoute] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      if (project) {
        const config = await fetchDatamapperConfiguration(project.name)

        dispatchMappingListConfig({
          type: 'IMPORT_CONFIG',
          payload: config,
        })

        setRoute(config.stage == 'Mapping' ? 'Properties' : 'Initialize')
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

  const [confirmed, setConfirmed] = useState<boolean>(mappingListConfig.stage != 'INIT')

  useEffect(() => {
    setConfirmed(mappingListConfig.stage !== 'INIT')
  }, [mappingListConfig.stage])

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!project || !mappingListConfig.formatTypes.source || !mappingListConfig.formatTypes.target) {
        if (!project) {
          showErrorToast('No project selected')
        }
        return
      }
      try {
        await saveDatamapperConfiguration(project?.name, JSON.stringify(mappingListConfig))
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : String(error))
      }
    }, 300) //Save **AFTER** 300 MS

    return () => clearTimeout(timeout) // If another save occurs within the 300MS, Reset timer and save after 300MS
  }, [mappingListConfig])

  return (
    <ReactFlowProvider>
      <FileProvider>
        {/* These buttons only exists for testing purposes, ignore the styling on these, they will be removed in later stages */}
        <div className="top fixed right-0 z-60 gap-2">
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
            onClick={handleManualConfigExport}
          >
            Export configuration
          </button>
          <button
            className="border-border hover:bg-hover active:bg-selected hidden w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
            onClick={() => {
              localStorage.clear()
              globalThis.location.reload()
            }}
          >
            RESET
          </button>
        </div>

        {/* Center modal/container */}
        <div className="bg-backdrop inset-0 z-50 h-screen items-center justify-center">
          <div className="bg-background text-foreground rounded-lg shadow-lg">
            {/* Header */}
            <div className="border-b-border box-border h-10 w-full rounded-t-md border-b bg-[radial-gradient(ellipse_farthest-corner_at_20%_20%,var(--type-pipe)_0%,var(--color-background)_100%)] p-2 text-lg font-semibold">
              Mapping (mappingName)
            </div>

            {/* Route buttons */}
            {mappingListConfig.stage == 'Mapping' && (
              <div className="my-3 flex h-10 w-full gap-4 px-4">
                {routes
                  .filter((routeName) => routeName != 'Initialize')
                  .map((routeName) => (
                    <Button key={routeName} className="flex-1" onClick={() => setRoute(routeName)}>
                      {routeName}
                    </Button>
                  ))}
              </div>
            )}

            {/* Main content */}
            <div className="w-full overflow-auto" style={{ maxHeight: 'calc(96vh - 93px)' }}>
              {route === 'Initialize' && (
                <Initialize
                  config={mappingListConfig}
                  configDispatch={dispatchMappingListConfig}
                  confirmed={confirmed}
                  setRoute={setRoute}
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
