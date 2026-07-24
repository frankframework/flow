import React from 'react'
import clsx from 'clsx'
import CloseButton from '~/components/inputs/close-button'
import CodeIcon from '/icons/solar/Code.svg?react'
import type { TabData } from '~/stores/tab-store'

export type TabProperties = {
  name: string
  isSelected: boolean
  onSelect: () => void
  onClose: (event: React.MouseEvent) => void
} & TabData

export default function Tab({
  name,
  configurationPath,
  icon,
  isSelected,
  onSelect,
  onClose,
}: Readonly<TabProperties>): React.JSX.Element {
  const Icon = icon ?? CodeIcon

  const handleClose = (event: React.MouseEvent<Element, MouseEvent>): void => {
    event.stopPropagation()
    onClose(event)
  }

  return (
    <li
      className={clsx(
        'group border-r-border text-text relative flex h-full rotate-x-180 list-none items-center justify-between gap-1 border-r border-b px-3',
        isSelected
          ? 'border-t-brand border-b-background bg-background text-foreground hover:bg-background border-t-3 font-medium'
          : 'bg-hover hover:bg-selected text-foreground-muted border-b-border border-t-3 border-t-transparent hover:cursor-pointer',
      )}
      onClick={onSelect}
      title={configurationPath}
    >
      <Icon className={'fill-foreground-muted h-4 w-auto'} />
      {name}
      <CloseButton className={clsx(isSelected ? '' : 'opacity-0 group-hover:opacity-100')} onClick={handleClose} />
    </li>
  )
}
