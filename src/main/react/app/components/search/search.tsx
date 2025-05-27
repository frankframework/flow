import React from 'react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'

interface SearchProperties {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function Search({ onChange, onKeyDown }: Readonly<SearchProperties>) {
  return (
    <div className="relative px-4">
      <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
        <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
      </label>
      <input
        id="search"
        className="border-border w-full rounded-full border bg-gray-100 py-1 pr-4 pl-7"
        type="search"
        placeholder="Search"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
