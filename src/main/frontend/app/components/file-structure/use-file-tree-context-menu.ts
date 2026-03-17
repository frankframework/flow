import { useCallback, useState } from 'react'
import type { TreeItemIndex } from 'react-complex-tree'
import {
  createFileInProject,
  createFolderInProject,
  renameInProject,
  deleteInProject,
} from '~/services/file-tree-service'
import { clearConfigurationCache } from '~/services/configuration-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { showErrorToastFrom } from '~/components/toast'

export interface ContextMenuState {
  position: { x: number; y: number }
  itemId: TreeItemIndex
  isFolder: boolean
  isRoot: boolean
  path: string
  name: string
}

export interface NameDialogState {
  title: string
  initialValue?: string
  onSubmit: (name: string) => void
}

export interface DeleteTargetState {
  name: string
  path: string
  isFolder: boolean
  parentItemId: TreeItemIndex
}

export interface DataProviderLike {
  getTreeItem(
    itemId: TreeItemIndex,
  ): Promise<{ data: { path: string; name: string; projectRoot?: boolean }; isFolder?: boolean } | undefined>
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
  return lastSlash > 0 ? str.slice(0, Math.max(0, lastSlash)) : 'root'
}

function ensureXmlExtension(name: string): string {
  if (name.includes('.')) return name
  return `${name}.xml`
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
        isRoot: !!item.data.projectRoot,
        path: item.data.path,
        name: item.data.name,
      })
    },
    [dataProvider],
  )

  const handleNewFile = useCallback(
    (ctx?: ContextMenuState) => {
      const menu = ctx ?? contextMenu
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.path
      const parentItemId = menu.itemId
      setContextMenu(null)

      setNameDialog({
        title: 'New File',
        onSubmit: async (name: string) => {
          const fileName = ensureXmlExtension(name)
          try {
            await createFileInProject(projectName, parentPath, fileName)
            await dataProvider.reloadDirectory(parentItemId)
          } catch (error) {
            showErrorToastFrom('Failed to create file', error)
          }
          setNameDialog(null)
        },
      })
    },
    [contextMenu, projectName, dataProvider],
  )

  const handleNewFolder = useCallback(
    (ctx?: ContextMenuState) => {
      const menu = ctx ?? contextMenu
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.path
      const parentItemId = menu.itemId
      setContextMenu(null)

      setNameDialog({
        title: 'New Folder',
        onSubmit: async (name: string) => {
          try {
            await createFolderInProject(projectName, parentPath, name)
            await dataProvider.reloadDirectory(parentItemId)
          } catch (error) {
            showErrorToastFrom('Failed to create folder', error)
          }
          setNameDialog(null)
        },
      })
    },
    [contextMenu, projectName, dataProvider],
  )

  const handleRename = useCallback(
    (ctx?: ContextMenuState) => {
      const menu = ctx ?? contextMenu
      if (!menu || !projectName || !dataProvider) return
      const itemId = menu.itemId
      const oldName = menu.name
      const oldPath = menu.path
      setContextMenu(null)

      setNameDialog({
        title: 'Rename',
        initialValue: oldName,
        onSubmit: async (newName: string) => {
          if (newName === oldName) {
            setNameDialog(null)
            return
          }
          try {
            await renameInProject(projectName, oldPath, newName)
            clearConfigurationCache(projectName, oldPath)
            const lastSep = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
            const newPath = oldPath.slice(0, Math.max(0, lastSep + 1)) + newName
            useTabStore.getState().renameTabsForConfig(oldPath, newPath)
            useEditorTabStore.getState().refreshAllTabs()
            const parentId = getParentItemId(itemId)
            await dataProvider.reloadDirectory(parentId)
            onAfterRename?.(oldPath, newName)
          } catch (error) {
            showErrorToastFrom('Failed to rename', error)
          }
          setNameDialog(null)
        },
      })
    },
    [contextMenu, projectName, dataProvider, onAfterRename],
  )

  const handleDelete = useCallback(
    (ctx?: ContextMenuState) => {
      const menu = ctx ?? contextMenu
      if (!menu) return
      setDeleteTarget({
        name: menu.name,
        path: menu.path,
        isFolder: menu.isFolder,
        parentItemId: getParentItemId(menu.itemId),
      })
      setContextMenu(null)
    },
    [contextMenu],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !projectName || !dataProvider) return

    try {
      await deleteInProject(projectName, deleteTarget.path)
      clearConfigurationCache(projectName, deleteTarget.path)
      useTabStore.getState().removeTabsForConfig(deleteTarget.path)
      useEditorTabStore.getState().refreshAllTabs()
      onAfterDelete?.(deleteTarget.path)
      await dataProvider.reloadDirectory(deleteTarget.parentItemId)
    } catch (error) {
      showErrorToastFrom('Failed to delete', error)
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
    openContextMenu,
    handleNewFile,
    handleNewFolder,
    handleRename,
    handleDelete,
    confirmDelete,
  }
}
