import StudioContextMenu from './studio-context-menu'
import NameInputDialog from './name-input-dialog'
import ConfirmDeleteDialog from './confirm-delete-dialog'
import type { StudioContextMenuState, NameDialogState, DeleteTargetState } from './use-studio-context-menu'

interface StudioFileTreeDialogsProps {
  contextMenu: StudioContextMenuState | null
  nameDialog: NameDialogState | null
  deleteTarget: DeleteTargetState | null
  onNewConfiguration: () => void
  onNewAdapter: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCloseContextMenu: () => void
  onCloseNameDialog: () => void
  onCloseDeleteDialog: () => void
}

export default function StudioFileTreeDialogs({
  contextMenu,
  nameDialog,
  deleteTarget,
  onNewConfiguration,
  onNewAdapter,
  onNewFolder,
  onRename,
  onDelete,
  onConfirmDelete,
  onCloseContextMenu,
  onCloseNameDialog,
  onCloseDeleteDialog,
}: StudioFileTreeDialogsProps) {
  return (
    <>
      {contextMenu && (
        <StudioContextMenu
          position={contextMenu.position}
          itemType={contextMenu.itemType}
          onNewConfiguration={onNewConfiguration}
          onNewAdapter={onNewAdapter}
          onNewFolder={onNewFolder}
          onRename={onRename}
          onDelete={onDelete}
          onClose={onCloseContextMenu}
        />
      )}

      {nameDialog && (
        <NameInputDialog
          title={nameDialog.title}
          initialValue={nameDialog.initialValue}
          onSubmit={nameDialog.onSubmit}
          onCancel={onCloseNameDialog}
          patterns={nameDialog.patterns}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.name}
          isFolder={deleteTarget.itemType === 'folder'}
          onConfirm={onConfirmDelete}
          onCancel={onCloseDeleteDialog}
        />
      )}
    </>
  )
}
