import React from 'react'
import clsx from 'clsx'

type ButtonVariant = 'default' | 'ghost'

export function buttonClasses(variant: ButtonVariant = 'default', disabled?: boolean, className?: string) {
  return clsx(
    'text-foreground rounded-md px-4 py-2',
    variant === 'default' && 'border-border bg-backdrop border',
    variant === 'ghost' && 'border border-transparent bg-transparent',
    !disabled && 'hover:bg-hover active:bg-selected hover:cursor-pointer',
    disabled && 'text-foreground-muted',
    className,
  )
}

export default function Button({
  children,
  className,
  variant = 'default',
  ...properties
}: React.PropsWithChildren<Readonly<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>>) {
  return (
    <button className={buttonClasses(variant, properties.disabled, className)} {...properties}>
      {children}
    </button>
  )
}
