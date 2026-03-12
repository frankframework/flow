import { FFDocProvider } from '@frankframework/doc-library-react'
import Navbar from '~/components/navbar/navbar'
import { FrankConfigXsdProvider } from '~/providers/frankconfig-xsd-provider'
import AppContent from '~/components/app-content'
import { useEffect, useState } from 'react'
import { useProjectStore, getStoredProjectRootPath } from '~/stores/project-store'
import { openProject } from '~/services/project-service'
import LoadingSpinner from '~/components/loading-spinner'
import { apiUrl } from '~/utils/api'

export default function AppLayout() {
  const [restoring, setRestoring] = useState(!!getStoredProjectRootPath())

  useEffect(() => {
    const rootPath = getStoredProjectRootPath()
    if (!rootPath) {
      setRestoring(false)
      return
    }

    openProject(rootPath)
      .then((fetched) => {
        useProjectStore.getState().setProject(fetched)
      })
      .catch(() => {
        useProjectStore.getState().clearProject()
      })
      .finally(() => {
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

  return (
    <FFDocProvider jsonUrl={apiUrl('/json/frankdoc')}>
      <FrankConfigXsdProvider>
        <div className="flex h-screen">
          <Navbar />
          <main className="grow overflow-auto">
            <AppContent />
          </main>
        </div>
      </FrankConfigXsdProvider>
    </FFDocProvider>
  )
}
