import { useCallback, useState } from 'react'
import type { TreeItemIndex } from 'react-complex-tree'
import {
  createFileInProject,
  createFolderInProject,
  renameInProject,
  deleteInProject,
} from '~/services/project-service'

export interface ContextMenuState {
  position: { x: number; y: number }
  itemId: TreeItemIndex
  isFolder: boolean
  path: string
  name: string
}

export interface NameDialogState {
  title: string
  onSubmit: (name: string) => void
}

export interface DeleteTargetState {
  name: string
  path: string
  isFolder: boolean
  parentItemId: TreeItemIndex
}

interface DataProviderLike {
  getTreeItem(itemId: TreeItemIndex): Promise<{ data: { path: string; name: string }; isFolder?: boolean } | undefined>
  reloadDirectory(itemId: TreeItemIndex): Promise<void>
}

interface UseFileTreeContextMenuOptions {
  projectName: string | undefined
  dataProvider: DataProviderLike | null
  onAfterRename?: (oldPath: string, newName: string) => void
  onAfterDelete?: (path: string) => void
}

export function getParentItemId(itemId: TreeItemIndex): TreeItemIndex {
  const str = String(itemId)
  const lastSlash = str.lastIndexOf('/')
  return lastSlash > 0 ? str.substring(0, lastSlash) : 'root'
}

export function useFileTreeContextMenu({
  projectName,
  dataProvider,
  onAfterRename,
  onAfterDelete,
}: UseFileTreeContextMenuOptions) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetState | null>(null)
  const [renamingItemId, setRenamingItemId] = useState<TreeItemIndex | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const openContextMenu = useCallback(
    async (e: React.MouseEvent, itemId: TreeItemIndex) => {
      e.preventDefault()
      e.stopPropagation()
      if (!dataProvider) return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        itemId,
        isFolder: !!item.isFolder,
        path: item.data.path,
        name: item.data.name,
      })
    },
    [dataProvider],
  )

  const handleNewFile = useCallback(() => {
    if (!contextMenu || !projectName || !dataProvider) return
    const parentPath = contextMenu.path
    const parentItemId = contextMenu.itemId
    setContextMenu(null)

    setNameDialog({
      title: 'New File',
      onSubmit: async (name: string) => {
        try {
          await createFileInProject(projectName, parentPath, name)
          await dataProvider.reloadDirectory(parentItemId)
        } catch (err) {
          console.error('Failed to create file:', err)
        }
        setNameDialog(null)
      },
    })
  }, [contextMenu, projectName, dataProvider])

  const handleNewFolder = useCallback(() => {
    if (!contextMenu || !projectName || !dataProvider) return
    const parentPath = contextMenu.path
    const parentItemId = contextMenu.itemId
    setContextMenu(null)

    setNameDialog({
      title: 'New Folder',
      onSubmit: async (name: string) => {
        try {
          await createFolderInProject(projectName, parentPath, name)
          await dataProvider.reloadDirectory(parentItemId)
        } catch (err) {
          console.error('Failed to create folder:', err)
        }
        setNameDialog(null)
      },
    })
  }, [contextMenu, projectName, dataProvider])

  const handleRename = useCallback(() => {
    if (!contextMenu) return
    setRenamingItemId(contextMenu.itemId)
    setRenameValue(contextMenu.name)
    setContextMenu(null)
  }, [contextMenu])

  const submitRename = useCallback(
    async (itemId: TreeItemIndex, newName: string) => {
      if (!projectName || !dataProvider) return
      setRenamingItemId(null)

      const item = await dataProvider.getTreeItem(itemId)
      if (!item || newName === item.data.name) return

      const oldPath = item.data.path
      try {
        await renameInProject(projectName, oldPath, newName)
        const parentId = getParentItemId(itemId)
        await dataProvider.reloadDirectory(parentId)
        onAfterRename?.(oldPath, newName)
      } catch (err) {
        console.error('Failed to rename:', err)
      }
    },
    [projectName, dataProvider, onAfterRename],
  )

  const handleDelete = useCallback(() => {
    if (!contextMenu) return
    setDeleteTarget({
      name: contextMenu.name,
      path: contextMenu.path,
      isFolder: contextMenu.isFolder,
      parentItemId: getParentItemId(contextMenu.itemId),
    })
    setContextMenu(null)
  }, [contextMenu])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !projectName || !dataProvider) return

    try {
      await deleteInProject(projectName, deleteTarget.path)
      onAfterDelete?.(deleteTarget.path)
      await dataProvider.reloadDirectory(deleteTarget.parentItemId)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
    setDeleteTarget(null)
  }, [deleteTarget, projectName, dataProvider, onAfterDelete])

  return {
    contextMenu,
    setContextMenu,
    nameDialog,
    setNameDialog,
    deleteTarget,
    setDeleteTarget,
    renamingItemId,
    setRenamingItemId,
    renameValue,
    setRenameValue,
    openContextMenu,
    handleNewFile,
    handleNewFolder,
    handleRename,
    submitRename,
    handleDelete,
    confirmDelete,
  }
}
