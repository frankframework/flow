import type { JSX } from 'react'
import { useNavigate } from 'react-router'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import Button from '~/components/inputs/button'
import { getStoredProjectRootPath } from '~/stores/project-store'

export default function NotFound(): JSX.Element {
  const navigate = useNavigate()

  const hasProject = Boolean(getStoredProjectRootPath())
  const destination = hasProject ? '/configurations' : '/'
  const buttonLabel = hasProject ? 'Back to overview' : 'Back to projects'

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center justify-center gap-6 p-4 text-center">
      <FfIcon className="h-16 w-auto opacity-80" />

      <div className="flex flex-col items-center gap-2">
        <p className="text-6xl font-bold">404</p>
        <h1 className="text-foreground text-2xl font-semibold">Page not found</h1>
        <p className="text-foreground-muted max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <Button onClick={(): void | Promise<void> => navigate(destination)}>{buttonLabel}</Button>
    </div>
  )
}
