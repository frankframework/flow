import React from 'react'
import clsx from 'clsx'

type ButtonVariant = 'default' | 'ghost' | 'primary' | 'destructive'

export function buttonClasses(variant: ButtonVariant = 'default', disabled?: boolean, className?: string) {
  return clsx(
    'rounded-md px-4 py-2',
    variant === 'default' && 'text-foreground border-border bg-backdrop border',
    variant === 'ghost' && 'text-foreground border border-transparent bg-transparent',
    variant === 'primary' && 'bg-brand font-medium text-white',
    variant === 'destructive' && 'bg-red-600 font-medium text-white',
    !disabled && (variant === 'default' || variant === 'ghost') && 'hover:bg-hover active:bg-selected cursor-pointer',
    !disabled && variant === 'primary' && 'hover:opacity-90 cursor-pointer',
    !disabled && variant === 'destructive' && 'hover:bg-red-700 cursor-pointer',
    disabled && 'cursor-not-allowed opacity-50',
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
