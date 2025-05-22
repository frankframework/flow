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
        <MagnifierIcon className="h-auto w-4 fill-foreground-muted" />
      </label>
      <input
        id="search"
        className="w-full rounded-full border border-border bg-gray-100 py-1 pr-4 pl-7"
        type="search"
        placeholder="Search"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
