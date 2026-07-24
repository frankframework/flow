import React from 'react'
import ActionButton from '~/routes/projectlanding/action-button'

export default function Sidebar({
  isLocal,
  onNewClick,
  onOpenClick,
  onCloneClick,
  onImportClick,
}: {
  isLocal?: boolean
  onNewClick: () => void
  onOpenClick: () => void
  onCloneClick: () => void
  onImportClick: () => void
}): React.JSX.Element {
  return (
    <nav className="border-border flex w-1/4 min-w-50 flex-col border-r p-3">
      <ActionButton
        label={isLocal ? 'Open Local Folder' : 'Open Workspace Configuration'}
        onClick={onOpenClick}
        className="text-start"
      />
      <ActionButton label="Clone Repository" onClick={onCloneClick} className="text-start" />
      <ActionButton label="New Configuration" onClick={onNewClick} className="text-start" />
      {!isLocal && <ActionButton label="Import Configuration Folder" onClick={onImportClick} className="text-start" />}
    </nav>
  )
}
