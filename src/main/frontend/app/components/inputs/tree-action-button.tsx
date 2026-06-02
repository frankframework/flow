import React from 'react'
import IconButton from '~/components/inputs/icon-button'

interface TreeActionButtonProps {
  title: string
  onAction: () => void
  children: React.ReactNode
}

export default function TreeActionButton({ title, onAction, children }: TreeActionButtonProps) {
  return (
    <IconButton title={title} onClick={() => onAction()}>
      {children}
    </IconButton>
  )
}
