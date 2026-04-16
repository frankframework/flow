import React, { useCallback, useRef, useState } from 'react'
import type { TreeItemIndex } from 'react-complex-tree'
import { createFile, deleteFile, renameFile } from '~/services/file-service'
import { createFolderInProject } from '~/services/file-tree-service'
import { clearConfigurationCache } from '~/services/configuration-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { showErrorToast, showErrorToastFrom } from '~/components/toast'
import { FILE_NAME_PATTERNS, FOLDER_OR_ADAPTER_NAME_PATTERNS } from '~/components/file-structure/name-input-dialog'

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
  patterns?: Record<string, RegExp>
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

const ALLOWED_EXTENSIONS = ['.xml', '.json', '.yaml', '.yml', '.properties']

export function getParentItemId(itemId: TreeItemIndex): TreeItemIndex {
  const str = String(itemId)
  const lastSlash = str.lastIndexOf('/')
  return lastSlash > 0 ? str.slice(0, Math.max(0, lastSlash)) : 'root'
}

function ensureHasCorrectExtension(name: string): boolean {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return false
  const extension = name.slice(dotIndex)
  return ALLOWED_EXTENSIONS.includes(extension.toLowerCase())
}

function buildNewPath(oldPath: string, newName: string): string {
  const lastSep = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
  return oldPath.slice(0, Math.max(0, lastSep + 1)) + newName
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
  const contextMenuRef = useRef<ContextMenuState | null>(null)

  const openContextMenu = useCallback(
    async (e: React.MouseEvent, itemId: TreeItemIndex) => {
      e.preventDefault()
      e.stopPropagation()
      if (!dataProvider) return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      const state: ContextMenuState = {
        position: { x: e.clientX, y: e.clientY },
        itemId,
        isFolder: !!item.isFolder,
        isRoot: !!item.data.projectRoot,
        path: item.data.path,
        name: item.data.name,
      }
      contextMenuRef.current = state
      setContextMenu(state)
    },
    [dataProvider],
  )

  const closeContextMenu = useCallback(() => {
    contextMenuRef.current = null
    setContextMenu(null)
  }, [])

  function resolveMenu(menuState?: ContextMenuState): ContextMenuState | null {
    return menuState ?? contextMenuRef.current
  }

  const handleNewFile = useCallback(
    (menuState?: ContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.path
      const parentItemId = menu.itemId
      closeContextMenu()

      setNameDialog({
        title: 'New File',
        onSubmit: async (name: string) => {
          if (!ensureHasCorrectExtension(name)) {
            showErrorToast(`Filename must have one of the following extensions: ${ALLOWED_EXTENSIONS.join(', ')}`)
            return
          }

          try {
            await createFile(projectName, `${parentPath}/${name}`)
            await dataProvider.reloadDirectory(parentItemId)
          } catch (error) {
            showErrorToastFrom('Failed to create file', error)
          }
          setNameDialog(null)
        },
        patterns: FILE_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, closeContextMenu],
  )

  const handleNewFolder = useCallback(
    (menuState?: ContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.path
      const parentItemId = menu.itemId
      closeContextMenu()

      setNameDialog({
        title: 'New Folder',
        onSubmit: async (name: string) => {
          try {
            await createFolderInProject(projectName, `${parentPath}/${name}`)
            await dataProvider.reloadDirectory(parentItemId)
          } catch (error) {
            showErrorToastFrom('Failed to create folder', error)
          }
          setNameDialog(null)
        },
        patterns: FOLDER_OR_ADAPTER_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, closeContextMenu],
  )

  const handleRename = useCallback(
    (menuState?: ContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const itemId = menu.itemId
      const oldName = menu.name
      const oldPath = menu.path
      closeContextMenu()

      setNameDialog({
        title: 'Rename',
        initialValue: oldName,
        onSubmit: async (newName: string) => {
          if (newName === oldName) {
            setNameDialog(null)
            return
          } else if (!ensureHasCorrectExtension(newName)) {
            showErrorToast(`Filename must have one of the following extensions: ${ALLOWED_EXTENSIONS.join(', ')}`)
            return
          }

          try {
            await renameFile(projectName, `${oldPath}`, `${oldPath}`.replace(oldName, newName))
            clearConfigurationCache(projectName, oldPath)
            const newPath = buildNewPath(oldPath, newName)
            useTabStore.getState().renameTabsForConfig(oldPath, newPath)
            useEditorTabStore.getState().refreshAllTabs()
            await dataProvider.reloadDirectory(getParentItemId(itemId))
            onAfterRename?.(oldPath, newName)
          } catch (error) {
            showErrorToastFrom('Failed to rename', error)
          }
          setNameDialog(null)
        },
        patterns: menu.isFolder ? FOLDER_OR_ADAPTER_NAME_PATTERNS : FILE_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, onAfterRename, closeContextMenu],
  )

  const handleDelete = useCallback(
    (menuState?: ContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu) return
      setDeleteTarget({
        name: menu.name,
        path: menu.path,
        isFolder: menu.isFolder,
        parentItemId: getParentItemId(menu.itemId),
      })
      closeContextMenu()
    },
    [closeContextMenu],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !projectName || !dataProvider) return

    try {
      await deleteFile(projectName, deleteTarget.path)
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
    closeContextMenu,
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
