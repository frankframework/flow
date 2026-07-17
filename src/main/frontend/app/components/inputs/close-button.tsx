import React from 'react'
import CloseIcon from '/icons/custom/Close.svg?react'
import IconButton from '~/components/inputs/icon-button'

type CloseButtonProperties = {
  onClick?: (event: React.MouseEvent) => void
  className?: string
}

export default function CloseButton({ onClick, className }: Readonly<CloseButtonProperties>) {
  return (
    <IconButton onClick={onClick} className={className}>
      <CloseIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
    </IconButton>
  )
}
