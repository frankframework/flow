import React, { useId } from 'react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import Input from '~/components/inputs/input'

interface SearchProperties {
  id?: string
  type?: string
  placeholder?: string
  value?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function Search({
  id,
  type = 'search',
  placeholder = 'Search',
  value,
  onChange,
  onKeyDown,
}: Readonly<SearchProperties>) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="relative px-4">
      <label htmlFor={inputId} className="absolute top-1/2 left-6 -translate-y-1/2">
        <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
      </label>
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        wrapperClassName="rounded-full"
        inputClassName="rounded-full pl-7"
      />
    </div>
  )
}
