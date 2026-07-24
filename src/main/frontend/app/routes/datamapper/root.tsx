import { type JSX, useEffect, useReducer, useState } from 'react'
import useToasts from '~/components/toast/use-toasts'
import PropertyList from './property-list'
import {
  DEFAULT_MAPPING_LIST_CONFIG,
  mappingListConfigReducer,
} from '~/stores/datamapper_state/mappingListConfig/reducer'
import Initialize from './initialize'
import MappingTable from './mapping-table'
import { ReactFlowProvider } from '@xyflow/react'
import Button from '~/components/inputs/button'
import { saveDatamapperConfiguration, fetchDatamapperConfiguration } from '~/services/datamapper-service'
import { useProjectStore } from '~/stores/project-store'
import { SAVING_THROTTLE } from '~/utils/datamapper_utils/constant'

export default function DataMapperRoot(): JSX.Element {
  const routes = ['Initialize', 'Properties', 'Mappings']

  const { project } = useProjectStore()
  const { showErrorToast, showSuccessToast } = useToasts()

  const [mappingListConfig, dispatchMappingListConfig] = useReducer(
    mappingListConfigReducer,
    DEFAULT_MAPPING_LIST_CONFIG,
  )
  const [route, setRoute] = useState('Initialize')

  useEffect((): void => {
    const loadConfig = async (): Promise<void> => {
      if (!project) {
        return
      }

      const config = await fetchDatamapperConfiguration(project.name)
      if (config) {
        dispatchMappingListConfig({
          type: 'IMPORT_CONFIG',
          payload: config,
        })

        setRoute(config.stage == 'Mapping' ? 'Properties' : 'Initialize')
      } else {
        setRoute('Initialize')
      }
    }

    loadConfig()
  }, [project])

  const [confirmed, setConfirmed] = useState<boolean>(mappingListConfig.stage != 'INIT')

  useEffect((): void => {
    setConfirmed(mappingListConfig.stage !== 'INIT')
  }, [mappingListConfig.stage])

  useEffect((): (() => void) => {
    const timeout = setTimeout(async (): Promise<void> => {
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
    }, SAVING_THROTTLE) //Save **AFTER** 300 MS

    return (): void => clearTimeout(timeout) // If another save occurs within the 300MS, Reset timer and save after 300MS
  }, [mappingListConfig, project, showErrorToast])

  return (
    <ReactFlowProvider>
      {/* These buttons only exists for testing purposes, ignore the styling on these, they will be removed in later stages */}
      <div className="top fixed right-0 z-60 gap-2">
        <button
          className="border-border hover:bg-hover active:bg-selected hidden w-48 rounded-md border bg-red-500 px-4 py-2 text-sm"
          onClick={(): void => {
            console.log(mappingListConfig)
            showSuccessToast('Logging config to console', 'Debug')
          }}
        >
          Test External node log
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
                .filter((routeName): boolean => routeName != 'Initialize')
                .map((routeName): JSX.Element => (
                  <Button key={routeName} className="flex-1" onClick={(): void => setRoute(routeName)}>
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
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
