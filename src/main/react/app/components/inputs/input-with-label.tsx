import React from 'react'

interface InputWithLabelProperties {
  htmlFor: string
  label: string
  description?: string
  inputSide?: 'left' | 'right'
  grow?: boolean
}

export default function InputWithLabel({
  htmlFor,
  label,
  description,
  inputSide = 'left',
  grow = false,
  children,
}: React.PropsWithChildren<Readonly<InputWithLabelProperties>>) {
  const isLeft = inputSide === 'left'
  return (
    <div className="flex items-center gap-4">
      {isLeft && children}
      {isLeft && grow && <div className="grow" />}
      <label className="cursor-pointer" htmlFor={htmlFor}>
        <span className="font-medium">{label}</span>
        {description && <div className="text-sm">{description}</div>}
      </label>
      {!isLeft && grow && <div className="grow" />}
      {!isLeft && children}
    </div>
  )
}
