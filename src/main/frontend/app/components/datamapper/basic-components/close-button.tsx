import clsx from 'clsx'
import type { JSX } from 'react'

export default function CloseButton({ onClick, className }: { onClick: () => void; className?: string }): JSX.Element {
  return (
    <button
      className={clsx(
        'text-error text-3xl leading-none font-bold drop-shadow-[0_0_1px_black] hover:opacity-80',
        className,
      )}
      onClick={(event): void => {
        event.stopPropagation()
        onClick()
      }}
    >
      &times;
    </button>
  )
}
