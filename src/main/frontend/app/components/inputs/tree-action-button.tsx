import React from 'react'
import IconButton from '~/components/inputs/icon-button'

type TreeActionButtonProperties = {
  title: string
  onAction: () => void
  children: React.ReactNode
}

export default function TreeActionButton({ title, onAction, children }: TreeActionButtonProperties) {
  return (
    <IconButton title={title} onClick={() => onAction()}>
      {children}
    </IconButton>
  )
}
