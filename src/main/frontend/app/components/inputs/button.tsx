import React from 'react'
import clsx from 'clsx'

type ButtonVariant = 'default' | 'ghost'

export default function Button({
  children,
  className,
  variant = 'default',
  ...properties
}: React.PropsWithChildren<Readonly<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>>) {
  return (
    <button
      className={clsx(
        'text-foreground rounded-md px-4 py-2',
        variant === 'default' && 'border-border bg-backdrop border',
        variant === 'ghost' && 'border border-transparent bg-transparent',
        !properties.disabled && 'hover:bg-hover active:bg-selected hover:cursor-pointer',
        properties.disabled && 'text-foreground-muted',
        className,
      )}
      {...properties}
    >
      {children}
    </button>
  )
}
