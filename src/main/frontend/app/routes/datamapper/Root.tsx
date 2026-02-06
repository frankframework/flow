import React, { useEffect, useReducer, useState } from 'react'

import PropertyList from './property-list'
import { showInfoToast } from '~/components/datamapper/Toast'
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
    //Automatically save the configuration whenever a change to the config is detected
    const timeout = setTimeout(() => {
      localStorage.setItem(FLOW_KEY, JSON.stringify(mappingListConfig))
    }, 300) //Changes from reactflow are persisted any time change is detected, added a 300ms timeout to prevent spamming the local storage.

    return () => clearTimeout(timeout)
  }, [mappingListConfig])

  return (
    <div>
      <div className="fixed top-0 right-0 z-60 bg-red-500">
        <ToggleThemeButton />
        <button
          className="border-border hover:bg-hover active:bg-selected hidden rounded-md border px-4 py-2"
          onClick={() => {
            console.dir(mappingListConfig)
            showInfoToast('Logging config to console!', 'Debug')
          }}
        >
          Test External node log
        </button>
        <button
          className="border-border hover:bg-hover active:bg-selected hidden rounded-md border px-4 py-2"
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
          className="border-border hover:bg-hover active:bg-selected rounded-md border px-4 py-2"
          onClick={handleManualConfigExport}
        >
          Export configuration file
        </button>
        <button
          className="border-border hover:bg-hover active:bg-selected rounded-md border px-4 py-2"
          onClick={() => {
            localStorage.clear()
            globalThis.location.reload()
          }}
        >
          RESET
        </button>
      </div>
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background text-foreground pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-lg shadow-lg">
          <div className="border-b-border box-border h-8 w-full rounded-t-md border-b bg-[radial-gradient(ellipse_farthest-corner_at_20%_20%,var(--type-pipe)_0%,var(--color-background)_100%)] p-1">
            Mapping (mappingName)
          </div>
          <div className="my-3 flex h-10 w-full gap-4 px-4">
            {routes.map((route) => (
              <button
                key={route}
                disabled={route !== 'Initialize' && !confirmed}
                className="border-border hover:bg-hover active:bg-selected text-foreground bg-backdrop disabled:bg-backdrop disabled:text-foreground-muted flex-1 rounded-md border px-4 py-2"
                onClick={() => setRoute(route)}
              >
                {route}
              </button>
            ))}
          </div>

          <div className="bg-selected flex-1 overflow-auto">
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
    </div>
  )
}

export default Root
