import React, { useId } from 'react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import Input from '~/components/inputs/input'

type SearchProperties = {
  id?: string
  type?: string
  placeholder?: string
  value?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function Search({
  id,
  type = 'search',
  placeholder = 'Search',
  value,
  className,
  inputClassName,
  autoFocus,
  onChange,
  onKeyDown,
}: Readonly<SearchProperties>): React.JSX.Element {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={className ?? 'px-4'}>
      <div className="relative">
        <label htmlFor={inputId} className="absolute top-1/2 left-3 -translate-y-1/2">
          <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
        </label>
        <Input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={onChange}
          onKeyDown={onKeyDown}
          wrapperClassName="rounded-full"
          inputClassName={`rounded-full pl-8 ${inputClassName ?? 'py-2'}`}
        />
      </div>
    </div>
  )
}
