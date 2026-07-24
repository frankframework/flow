import clsx from 'clsx'
import type { JSX } from 'react'
import Button from '~/components/inputs/button'

type LoadErrorProperties = {
  message?: string
  onRetry: () => void
  className?: string
}

export default function LoadError({
  message = 'Something went wrong while loading.',
  onRetry,
  className,
}: Readonly<LoadErrorProperties>): JSX.Element {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-4 text-center', className)}>
      <p className="text-foreground-muted text-sm whitespace-pre-line">{message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  )
}
