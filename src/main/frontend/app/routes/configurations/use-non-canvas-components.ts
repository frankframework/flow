import { useCallback, useEffect, useState } from 'react'
import {
  getNonCanvasComponentsFromConfiguration,
  type NonCanvasComponent,
} from '~/services/non-canvas-component-service'

const PATH_SEPARATOR = '\n'

interface NonCanvasComponentsState {
  componentsByPath: Record<string, NonCanvasComponent[]>
  loadingByPath: Record<string, boolean>
  replaceComponents: (configurationPath: string, components: NonCanvasComponent[]) => void
}

export function useNonCanvasComponents(projectName: string, configurationPaths: string[]): NonCanvasComponentsState {
  const [componentsByPath, setComponentsByPath] = useState<Record<string, NonCanvasComponent[]>>({})
  const [loadingByPath, setLoadingByPath] = useState<Record<string, boolean>>({})
  const pathsKey = configurationPaths.join(PATH_SEPARATOR)

  useEffect(() => {
    const paths = pathsKey ? pathsKey.split(PATH_SEPARATOR) : []
    const controller = new AbortController()

    setLoadingByPath(Object.fromEntries(paths.map((path) => [path, true])))

    for (const path of paths) {
      getNonCanvasComponentsFromConfiguration(projectName, path, controller.signal)
        .then((components) => {
          if (controller.signal.aborted) return
          setComponentsByPath((previous) => ({ ...previous, [path]: components }))
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setComponentsByPath((previous) => ({ ...previous, [path]: [] }))
        })
        .finally(() => {
          if (controller.signal.aborted) return
          setLoadingByPath((previous) => ({ ...previous, [path]: false }))
        })
    }

    return () => controller.abort()
  }, [projectName, pathsKey])

  const replaceComponents = useCallback((configurationPath: string, components: NonCanvasComponent[]) => {
    setComponentsByPath((previous) => ({ ...previous, [configurationPath]: components }))
  }, [])

  return { componentsByPath, loadingByPath, replaceComponents }
}
