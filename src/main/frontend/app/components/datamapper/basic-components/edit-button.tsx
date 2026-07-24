import clsx from 'clsx'
import TextCircle from '/icons/solar/Text Circle.svg?react'
import type { JSX } from 'react'

export default function EditButton({ onClick, className }: { onClick: () => void; className?: string }): JSX.Element {
  return (
    <button
      className={clsx('hover:opacity-70', className)}
      onClick={(event): void => {
        event.stopPropagation()
        onClick()
      }}
    >
      <TextCircle className="fill-foreground h-6" />
    </button>
  )
}
