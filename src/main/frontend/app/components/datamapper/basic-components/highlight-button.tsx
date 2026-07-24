import clsx from 'clsx'
import LightBulb from '/icons/solar/Lightbulb.svg?react'
import type { JSX } from 'react'

export default function HighlightButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}): JSX.Element {
  return (
    <button
      className={clsx('hover:opacity-70', className)}
      onClick={(event): void => {
        event.stopPropagation()
        onClick()
      }}
    >
      <LightBulb className="hover:text-active fill-foreground h-6" />
    </button>
  )
}
