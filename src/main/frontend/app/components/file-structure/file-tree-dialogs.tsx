import ContextMenu from './context-menu'
import NameInputDialog, { FILE_NAME_PATTERNS, FOLDER_OR_ADAPTER_NAME_PATTERNS } from './name-input-dialog'
import ConfirmDeleteDialog from './confirm-delete-dialog'
import type { ContextMenuState, NameDialogState, DeleteTargetState } from './use-file-tree-context-menu'

interface FileTreeDialogsProps {
  contextMenu: ContextMenuState | null
  nameDialog: NameDialogState | null
  deleteTarget: DeleteTargetState | null
  onNewFile: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCloseContextMenu: () => void
  onCloseNameDialog: () => void
  onCloseDeleteDialog: () => void
}

export default function FileTreeDialogs({
  contextMenu,
  nameDialog,
  deleteTarget,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onConfirmDelete,
  onCloseContextMenu,
  onCloseNameDialog,
  onCloseDeleteDialog,
}: FileTreeDialogsProps) {
  return (
    <>
      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          isFolder={contextMenu.isFolder}
          isRoot={contextMenu.isRoot}
          onNewFile={onNewFile}
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
          patterns={
            nameDialog.title.toLowerCase().includes('folder') ? FOLDER_OR_ADAPTER_NAME_PATTERNS : FILE_NAME_PATTERNS
          }
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.name}
          isFolder={deleteTarget.isFolder}
          onConfirm={onConfirmDelete}
          onCancel={onCloseDeleteDialog}
        />
      )}
    </>
  )
}
