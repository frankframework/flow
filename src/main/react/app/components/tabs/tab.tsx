import React from 'react'
import clsx from 'clsx'
import CloseIcon from '/icons/custom/Close.svg?react'
import type { TabsItem } from '~/components/tabs/tabs'
import CodeIcon from '/icons/solar/Code.svg?react'

export type TabProperties = {
  isSelected: boolean
  onSelect: () => void
  onClose: (event: React.MouseEvent) => void
} & TabsItem

export default function Tab({ value, icon, isSelected, onSelect, onClose }: Readonly<TabProperties>) {
  const Icon = icon ?? CodeIcon
  return (
    <li
      className={clsx(
        'group relative flex h-full rotate-x-180 list-none items-center justify-between gap-1 border-r border-b border-r-border  px-4 text-text',
        isSelected
          ? 'border-t-3 border-t-brand border-b-background bg-background font-medium text-foreground hover:bg-background'
          : 'border-t-3 border-t-transparent bg-hover hover:cursor-pointer hover:bg-selected text-foreground-muted border-b-border',
      )}
      onClick={onSelect}
    >
      <Icon className={'h-4 w-auto fill-foreground-muted'} />
      {value}
      <CloseIcon
        className={clsx(
          'h-8 w-auto hover:cursor-pointer hover:fill-foreground',
          isSelected ? 'fill-foreground-muted' : 'group-hover:fill-foreground-muted',
        )}
        onClick={(event) => onClose(event)}
      />
    </li>
  )
}
