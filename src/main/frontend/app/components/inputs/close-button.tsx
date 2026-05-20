import React from 'react'
import clsx from 'clsx'
import CloseIcon from '/icons/custom/Close.svg?react'

interface CloseButtonProps {
  onClick?: (event: React.MouseEvent) => void
  className?: string
}

export default function CloseButton({ onClick, className }: Readonly<CloseButtonProps>) {
  return (
    <CloseIcon
      className={clsx('fill-foreground-muted hover:fill-foreground h-5 w-auto cursor-pointer', className)}
      onClick={onClick}
    />
  )
}
