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
        'group relative flex h-full rotate-x-180 list-none items-center justify-between gap-1 border-r border-b border-r-border border-b-border px-4 text-gray-1000',
        isSelected
          ? 'border-t-3 border-t-brand border-b-white bg-white font-medium text-text hover:bg-white'
          : 'border-t-3 border-t-transparent bg-gray-100 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-800',
      )}
      onClick={onSelect}
    >
      <Icon className={'h-4 w-auto fill-icon'} />
      {value}
      <CloseIcon
        className={clsx(
          'h-8 w-auto hover:cursor-pointer hover:fill-gray-600',
          isSelected ? 'fill-icon-muted' : 'group-hover:fill-icon-muted',
        )}
        onClick={(event) => onClose(event)}
      />
    </li>
  )
}
