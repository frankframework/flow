import { useCallback, useEffect, useState } from 'react'
import {
  getNonCanvasComponentsFromConfiguration,
  type NonCanvasComponent,
} from '~/services/non-canvas-component-service'

type NonCanvasComponentsState = {
  componentsByPath: Record<string, NonCanvasComponent[]>
  loadingByPath: Record<string, boolean>
  replaceComponents: (configurationPath: string, components: NonCanvasComponent[]) => void
}

export function useNonCanvasComponents(projectName: string, configurationPaths: string[]): NonCanvasComponentsState {
  const [componentsByPath, setComponentsByPath] = useState<Record<string, NonCanvasComponent[]>>({})
  const [loadingByPath, setLoadingByPath] = useState<Record<string, boolean>>({})

  useEffect((): (() => void) => {
    const controller = new AbortController()

    setLoadingByPath(Object.fromEntries(configurationPaths.map((path): [string, true] => [path, true])))

    for (const path of configurationPaths) {
      getNonCanvasComponentsFromConfiguration(projectName, path, controller.signal)
        .then((components): void => {
          if (controller.signal.aborted) return
          setComponentsByPath((previous): Record<string, NonCanvasComponent[]> => ({
            ...previous,
            [path]: components,
          }))
        })
        .catch((): void => {
          if (controller.signal.aborted) return
          setComponentsByPath((previous): Record<string, never[] | NonCanvasComponent[]> => ({
            ...previous,
            [path]: [],
          }))
        })
        .finally((): void => {
          if (controller.signal.aborted) return
          setLoadingByPath((previous): Record<string, boolean> => ({ ...previous, [path]: false }))
        })
    }

    return (): void => controller.abort()
  }, [projectName, configurationPaths])

  const replaceComponents = useCallback((configurationPath: string, components: NonCanvasComponent[]): void => {
    setComponentsByPath((previous): Record<string, NonCanvasComponent[]> => ({
      ...previous,
      [configurationPath]: components,
    }))
  }, [])

  return { componentsByPath, loadingByPath, replaceComponents }
}
