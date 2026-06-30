import React from 'react'
import clsx from 'clsx'

type SegmentedButtonProperties = {
  isActive?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export default function SegmentedButton({
  isActive = false,
  className,
  children,
  ...properties
}: Readonly<SegmentedButtonProperties>) {
  return (
    <button
      className={clsx(
        'text-foreground cursor-pointer px-3 py-1 text-sm',
        isActive ? 'bg-selected font-medium' : 'text-foreground-muted hover:bg-hover active:bg-selected',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
