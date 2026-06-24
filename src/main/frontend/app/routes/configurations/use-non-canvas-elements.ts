import { useCallback, useEffect, useState } from 'react'
import { getNonCanvasElementsFromConfiguration, type NonCanvasElement } from '~/services/non-canvas-element-service'

const PATH_SEPARATOR = '\n'

interface NonCanvasElementsState {
  elementsByPath: Record<string, NonCanvasElement[]>
  loadingByPath: Record<string, boolean>
  replaceElements: (configurationPath: string, elements: NonCanvasElement[]) => void
}

export function useNonCanvasElements(projectName: string, configurationPaths: string[]): NonCanvasElementsState {
  const [elementsByPath, setElementsByPath] = useState<Record<string, NonCanvasElement[]>>({})
  const [loadingByPath, setLoadingByPath] = useState<Record<string, boolean>>({})
  const pathsKey = configurationPaths.join(PATH_SEPARATOR)

  useEffect(() => {
    const paths = pathsKey ? pathsKey.split(PATH_SEPARATOR) : []
    const controller = new AbortController()

    setLoadingByPath(Object.fromEntries(paths.map((path) => [path, true])))

    for (const path of paths) {
      getNonCanvasElementsFromConfiguration(projectName, path, controller.signal)
        .then((elements) => {
          if (controller.signal.aborted) return
          setElementsByPath((previous) => ({ ...previous, [path]: elements }))
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setElementsByPath((previous) => ({ ...previous, [path]: [] }))
        })
        .finally(() => {
          if (controller.signal.aborted) return
          setLoadingByPath((previous) => ({ ...previous, [path]: false }))
        })
    }

    return () => controller.abort()
  }, [projectName, pathsKey])

  const replaceElements = useCallback((configurationPath: string, elements: NonCanvasElement[]) => {
    setElementsByPath((previous) => ({ ...previous, [configurationPath]: elements }))
  }, [])

  return { elementsByPath, loadingByPath, replaceElements }
}
