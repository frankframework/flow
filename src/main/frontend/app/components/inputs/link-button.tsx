import React from 'react'
import { buttonClasses } from './button'

type ButtonVariant = 'default' | 'ghost'

export default function LinkButton({
  children,
  className,
  variant = 'default',
  ...properties
}: React.PropsWithChildren<
  Readonly<React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }>
>): React.JSX.Element {
  return (
    <a className={buttonClasses(variant, false, className)} {...properties}>
      {children}
    </a>
  )
}
