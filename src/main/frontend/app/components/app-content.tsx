import { Outlet } from 'react-router'
import { Suspense } from 'react'
import LoadingSpinner from '~/components/loading-spinner'

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner size="lg" message="Loading..." />
    </div>
  )
}

export default function AppContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Outlet />
    </Suspense>
  )
}
