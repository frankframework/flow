import { createBrowserRouter, isRouteErrorResponse, useRouteError } from 'react-router'
import ConfigurationOverview from '~/routes/configurations/configuration-overview'
import CodeEditor from '~/routes/editor/editor'
import Help from '~/routes/help/help'
import NotFound from '~/routes/notfound/not-found'
import Settings from '~/routes/settings/settings'
import Studio from '~/routes/studio/studio'
import ProjectLanding from './routes/projectlanding/project-landing'
import AppLayout from './routes/app-layout'

function RootErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>Oops!</h1>
      <p>An unexpected error occurred.</p>
    </main>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RootErrorBoundary />,
    children: [
      {
        index: true,
        element: <ProjectLanding />,
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: 'configurations',
            element: <ConfigurationOverview />,
          },
          {
            path: 'studio',
            element: <Studio />,
          },
          {
            path: 'editor',
            element: <CodeEditor />,
          },
          {
            path: 'help/:topic?',
            element: <Help />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
