import React from 'react'
import clsx from 'clsx'

type IconButtonProps = {
  title?: string
  onClick?: (event: React.MouseEvent) => void
  onContextMenu?: (event: React.MouseEvent) => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}

export default function IconButton({
  title,
  onClick,
  onContextMenu,
  className,
  disabled = false,
  children,
}: Readonly<IconButtonProps>) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={clsx(
        'icon-button group shrink-0 cursor-pointer rounded p-0.5',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-hover',
        className,
      )}
      title={title}
      onClick={(mouseEvent) => {
        mouseEvent.stopPropagation()
        if (!disabled) onClick?.(mouseEvent)
      }}
      onKeyDown={(keyboardEvent) => {
        if (!disabled && keyboardEvent.key === 'Enter') {
          onClick?.(keyboardEvent as unknown as React.MouseEvent)
        }
      }}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  )
}
