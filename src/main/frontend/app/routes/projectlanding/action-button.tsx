import React from 'react'
import Button from '~/components/inputs/button'

interface ActionButtonProperties {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  label: string
  className?: string
}

export default function ActionButton({ onClick, label, className }: Readonly<ActionButtonProperties>) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start !rounded px-3 py-1 text-sm whitespace-nowrap ${className ?? ''}`}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
