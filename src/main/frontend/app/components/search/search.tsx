import React from 'react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import Input from '~/components/inputs/input'

interface SearchProperties {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function Search({ onChange, onKeyDown }: Readonly<SearchProperties>) {
  return (
    <div className="relative px-4">
      <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
        <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
      </label>
      <Input
        onChange={onChange}
        onKeyDown={onKeyDown}
        type="search"
        placeholder="Search"
        wrapperClassName="rounded-full"
        inputClassName="rounded-full pl-7"
      />
    </div>
  )
}
