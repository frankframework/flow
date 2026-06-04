import { createBrowserRouter } from 'react-router'
import ProjectLanding from './routes/projectlanding/project-landing'
import AppLayout from './routes/app-layout'

function RootErrorBoundary() {
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
    element: <ProjectLanding />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: '*',
    element: <AppLayout />,
    errorElement: <RootErrorBoundary />,
  },
])
