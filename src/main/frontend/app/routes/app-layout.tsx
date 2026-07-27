import { FFDocProvider } from '@frankframework/doc-library-react'
import { Outlet } from 'react-router'
import Navbar from '~/components/navbar/navbar'
import { FrankConfigXsdProvider } from '~/providers/frankconfig-xsd-provider'
import { type JSX, Suspense, useEffect, useState } from 'react'
import { useProjectStore, getStoredProjectRootPath } from '~/stores/project-store'
import { openProject } from '~/services/project-service'
import LoadingSpinner from '~/components/loading-spinner'
import { apiUrl } from '~/utils/api'
import { useShortcutListener } from '~/hooks/use-shortcut-listener'
import { useFileWatcher } from '~/hooks/use-file-watcher'

export default function AppLayout(): JSX.Element {
  useShortcutListener()

  const projectName = useProjectStore((state): string | undefined => state.project?.name)
  useFileWatcher(projectName)

  const [restoring, setRestoring] = useState(!!getStoredProjectRootPath())

  useEffect((): void => {
    const rootPath = getStoredProjectRootPath()
    if (!rootPath) {
      setRestoring(false)
      return
    }

    openProject(rootPath)
      .then((fetched): void => {
        useProjectStore.getState().setProject(fetched)
      })
      .catch((): void => {
        useProjectStore.getState().clearProject()
      })
      .finally((): void => {
        setRestoring(false)
      })
  }, [])

  if (restoring) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner message="Restoring project..." />
      </div>
    )
  }

  function LoadingFallback(): JSX.Element {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    )
  }

  return (
    <FFDocProvider jsonUrl={apiUrl('/json/frankdoc')}>
      <FrankConfigXsdProvider>
        <div className="flex h-screen">
          <Navbar />
          <main className="grow overflow-auto">
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </FrankConfigXsdProvider>
    </FFDocProvider>
  )
}
