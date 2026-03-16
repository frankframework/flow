import React from 'react'
import clsx from 'clsx'

export default function Button({
  children,
  className,
  ...properties
}: React.PropsWithChildren<Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>>) {
  return (
    <button
      className={clsx(
        'border-border text-foreground bg-backdrop rounded-md border px-4 py-2',
        !properties.disabled && 'hover:bg-hover hover:text-foreground-active active:bg-selected hover:cursor-pointer',
        properties.disabled && 'text-foreground-muted',

        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
