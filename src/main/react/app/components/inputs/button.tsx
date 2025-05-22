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
        'hover:bg-brand hover:text-foreground focus:ring-brand rounded-md bg-gray-950 px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
