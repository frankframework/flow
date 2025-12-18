import React from 'react'
import clsx from 'clsx'
import CloseIcon from '/icons/custom/Close.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import type { TabsItem } from './tabs'

export type TabProperties = {
  value: string
  isSelected: boolean
  onSelect: () => void
  onClose: (event: React.MouseEvent) => void
} & TabsItem

export default function Tab({ value, icon, isSelected, onSelect, onClose }: Readonly<TabProperties>) {
  const Icon = icon ?? CodeIcon

  const handleClose = (event: React.MouseEvent<Element, MouseEvent>) => {
    event.stopPropagation()
    onClose(event)
  }

  return (
    <li
      className={clsx(
        'group border-r-border text-text relative flex h-full rotate-x-180 list-none items-center justify-between gap-1 border-r border-b px-4',
        isSelected
          ? 'border-t-brand border-b-background bg-background text-foreground hover:bg-background border-t-3 font-medium'
          : 'bg-hover hover:bg-selected text-foreground-muted border-b-border border-t-3 border-t-transparent hover:cursor-pointer',
      )}
      onClick={onSelect}
    >
      <Icon className={'fill-foreground-muted h-4 w-auto'} />
      {value}
      <CloseIcon
        className={clsx(
          'hover:fill-foreground h-8 w-auto hover:cursor-pointer',
          isSelected ? 'fill-foreground-muted' : 'group-hover:fill-foreground-muted',
        )}
        onClick={handleClose}
      />
    </li>
  )
}
