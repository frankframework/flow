import React from 'react'
import clsx from 'clsx'

export default function Button({
  children,
  className,
  ...properties
}: React.PropsWithChildren<Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>>) {
  return (
    <button
            autoFocus
      className={clsx(
              'border border-border py-2 px-4 rounded-md hover:bg-hover active:bg-selected text-foreground bg-backdrop',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
