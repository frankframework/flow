import { type AppRoute, useNavigationStore } from '~/stores/navigation-store'
import { lazy, Suspense, type ComponentType } from 'react'
import LoadingSpinner from '~/components/loading-spinner'

const ConfigurationManager = lazy(() => import('~/routes/configurations/configuration-manager'))
const Studio = lazy(() => import('~/routes/studio/studio'))
const CodeEditor = lazy(() => import('~/routes/editor/editor'))
const Help = lazy(() => import('~/routes/help/help'))
const Settings = lazy(() => import('~/routes/settings/settings'))

const routeComponents: Record<AppRoute, React.LazyExoticComponent<ComponentType>> = {
  configurations: ConfigurationManager,
  studio: Studio,
  editor: CodeEditor,
  help: Help,
  settings: Settings,
}

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner size="lg" message="Loading..." />
    </div>
  )
}

export default function AppContent() {
  const currentRoute = useNavigationStore((state) => state.currentRoute)
  const RouteComponent = routeComponents[currentRoute]

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteComponent key={currentRoute} />
    </Suspense>
  )
}
