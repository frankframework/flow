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
        'border-border hover:bg-hover active:bg-selected text-foreground bg-backdrop rounded-md border px-4 py-2',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
