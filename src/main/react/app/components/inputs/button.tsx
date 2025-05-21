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
        'rounded-md bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand)] hover:text-gray-950 focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-offset-2 focus:outline-none',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
