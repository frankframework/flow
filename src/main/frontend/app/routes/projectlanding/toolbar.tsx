import React from 'react'
import Search from '~/components/search/search'
import LibraryIcon from '/icons/solar/Library.svg?react'

export default function Toolbar({ onSearchChange }: { onSearchChange: (value: string) => void }) {
  return (
    <div className="border-border flex h-11 border-b">
      <div className="border-border text-foreground flex w-1/4 min-w-50 items-center border-r px-4 text-xs font-bold tracking-wider uppercase">
        <LibraryIcon className="fill-foreground h-5 w-5" />
        <p className="ms-3 align-middle text-sm font-medium normal-case">Configurations</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <Search
          className="w-full"
          inputClassName="py-1"
          onChange={(changeEvent) => onSearchChange(changeEvent.target.value)}
        />
      </div>
    </div>
  )
}
