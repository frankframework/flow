import React from 'react'

interface InputWithLabelProperties {
  id: string
  label: string
  description?: string
  side?: 'left' | 'right'
  grow?: boolean
}

export default function InputWithLabel({
  id,
  label,
  description,
  side = 'left',
  grow = false,
  children,
}: React.PropsWithChildren<Readonly<InputWithLabelProperties>>) {
  const isLeft = side === 'left'
  return (
    <div className="flex items-center gap-4">
      {isLeft && children}
      {isLeft && grow && <div className="grow" />}
      <div>
        <label className="font-medium cursor-pointer" htmlFor={id} id={id}>
          {label}
        </label>
        {description && <div>{description}</div>}
      </div>
      {!isLeft && grow && <div className="grow" />}
      {!isLeft && children}
    </div>
  )
}
