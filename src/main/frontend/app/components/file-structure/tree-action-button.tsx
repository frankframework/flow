import React from 'react'

interface TreeActionButtonProps {
  title: string
  onAction: () => void
  children: React.ReactNode
}

export default function TreeActionButton({ title, onAction, children }: TreeActionButtonProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="hover:bg-hover flex-shrink-0 cursor-pointer rounded p-0.5"
      title={title}
      onClick={(mouseEvent) => {
        mouseEvent.stopPropagation()
        onAction()
      }}
      onKeyDown={(keyboardEvent) => keyboardEvent.key === 'Enter' && onAction()}
    >
      {children}
    </div>
  )
}
