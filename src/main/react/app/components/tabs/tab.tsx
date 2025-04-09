import React from 'react'
import clsx from 'clsx'
import CloseSquareIcon from '/icons/solar/Close Square.svg?react'
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
        'group relative flex h-full rotate-x-180 list-none items-center justify-between gap-1 border-r border-b border-r-gray-200 border-b-gray-200 px-4 text-gray-500',
        isSelected
          ? 'border-b-white bg-white font-medium text-gray-950 hover:bg-white'
          : 'bg-gray-50 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-800',
      )}
      onClick={onSelect}
    >
      <Icon className={'h-4 w-auto fill-gray-950'} />
      {value}
      <CloseSquareIcon
        className={clsx('h-5 hover:fill-gray-500', isSelected ? 'fill-gray-400' : 'group-hover:fill-gray-400')}
        onClick={(event) => onClose(event)}
      />
    </li>
  )
}
