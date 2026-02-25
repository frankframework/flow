import React from 'react'
import Button from '~/components/inputs/button'

interface ActionButtonProperties {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  label: string
}

export default function ActionButton({ onClick, label }: Readonly<ActionButtonProperties>) {
  return (
    <Button className="justify-left flex border-none" onClick={onClick}>
      {label}
    </Button>
  )
}
