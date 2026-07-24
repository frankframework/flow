import React from 'react'
import IconButton from '~/components/inputs/icon-button'

type TreeActionButtonProperties = {
  title: string
  onAction: () => void
  children: React.ReactNode
}

export default function TreeActionButton({ title, onAction, children }: TreeActionButtonProperties): React.JSX.Element {
  return (
    <IconButton title={title} onClick={(): void => onAction()}>
      {children}
    </IconButton>
  )
}
