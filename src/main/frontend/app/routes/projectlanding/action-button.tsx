import React from 'react'

interface ActionButtonProperties {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  label: string
}

export default function ActionButton({ onClick, label }: Readonly<ActionButtonProperties>) {
  return (
    <button className="hover:bg-backdrop w-full rounded px-2 py-2 text-left hover:cursor-pointer" onClick={onClick}>
      {label}
    </button>
  )
}
