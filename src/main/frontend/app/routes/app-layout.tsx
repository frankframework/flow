import Navbar from '~/components/navbar/navbar'
import { FrankDocProvider } from '~/providers/frankdoc-provider'
import AppContent from '~/components/app-content'
import { useEffect, useState } from 'react'
import { useProjectStore, getStoredProjectName } from '~/stores/project-store'
import { fetchProject } from '~/services/project-service'
import LoadingSpinner from '~/components/loading-spinner'

export default function AppLayout() {
  const [restoring, setRestoring] = useState(!!getStoredProjectName())

  useEffect(() => {
    const storedName = getStoredProjectName()
    if (!storedName) {
      setRestoring(false)
      return
    }

    fetchProject(storedName)
      .then((fetched) => {
        useProjectStore.getState().setProject(fetched)
      })
      .catch(() => {
        sessionStorage.removeItem('active-project-name')
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
    <FrankDocProvider>
      <div className="flex h-screen">
        <Navbar />
        <main className="grow overflow-auto">
          <AppContent />
        </main>
      </div>
    </FrankDocProvider>
  )
}
