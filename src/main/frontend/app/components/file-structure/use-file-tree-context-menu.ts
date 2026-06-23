import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { TreeItemIndex } from 'react-complex-tree'
import { createFile, deleteFile, renameFile } from '~/services/file-service'
import { createFolderInProject } from '~/services/file-tree-service'
import { clearConfigurationFileCache, createConfigurationFile } from '~/services/configuration-file-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { showErrorToast } from '~/components/toast'
import { FILE_NAME_PATTERNS, FOLDER_OR_ADAPTER_NAME_PATTERNS } from '~/components/file-structure/name-input-dialog'
import { logApiError } from '~/utils/logger'
import { openInEditor } from '~/actions/navigationActions'

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
  submitLabel?: string
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
  configurationsRootPath?: string
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
  configurationsRootPath,
  onAfterRename,
  onAfterDelete,
}: UseFileTreeContextMenuOptions) {
  const navigate = useNavigate()
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
      const parentPath = menu.isFolder ? menu.path : buildNewPath(menu.path, '').slice(0, -1)
      const parentItemId = menu.isFolder ? menu.itemId : getParentItemId(menu.itemId)
      closeContextMenu()

      setNameDialog({
        title: 'New File',
        submitLabel: 'Create',
        onSubmit: async (name: string) => {
          if (!ensureHasCorrectExtension(name)) {
            showErrorToast(`Filename must have one of the following extensions: ${ALLOWED_EXTENSIONS.join(', ')}`)
            return
          }

          const filePath = `${parentPath}/${name}`
          const isXml = name.toLowerCase().endsWith('.xml')
          const isInsideConfigurations = parentPath.startsWith(configurationsRootPath ?? '')

          try {
            await (isXml && isInsideConfigurations
              ? createConfigurationFile(projectName, filePath)
              : createFile(projectName, filePath))

            await dataProvider.reloadDirectory(parentItemId)

            openInEditor(name, filePath, navigate)
          } catch (error) {
            logApiError('Failed to create file', error as Error)
          }
          setNameDialog(null)
        },
        patterns: FILE_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, configurationsRootPath, navigate, closeContextMenu],
  )

  const handleNewFolder = useCallback(
    (menuState?: ContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.isFolder ? menu.path : buildNewPath(menu.path, '').slice(0, -1)
      const parentItemId = menu.isFolder ? menu.itemId : getParentItemId(menu.itemId)
      closeContextMenu()

      setNameDialog({
        title: 'New Folder',
        submitLabel: 'Create',
        onSubmit: async (name: string) => {
          try {
            await createFolderInProject(projectName, `${parentPath}/${name}`)
            await dataProvider.reloadDirectory(parentItemId)
          } catch (error) {
            logApiError('Failed to create folder', error as Error)
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
          } else if (!menu.isFolder && !ensureHasCorrectExtension(newName)) {
            showErrorToast(`Filename must have one of the following extensions: ${ALLOWED_EXTENSIONS.join(', ')}`)
            return
          }

          try {
            await renameFile(projectName, oldPath, buildNewPath(oldPath, newName))
            clearConfigurationFileCache(projectName, oldPath)
            const newPath = buildNewPath(oldPath, newName)
            useTabStore.getState().renameTabsForConfig(oldPath, newPath)
            useEditorTabStore.getState().refreshAllTabs()
            await dataProvider.reloadDirectory(getParentItemId(itemId))
            onAfterRename?.(oldPath, newName)
          } catch (error) {
            logApiError('Failed to rename', error as Error)
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
      clearConfigurationFileCache(projectName, deleteTarget.path)
      useTabStore.getState().removeTabsForConfig(deleteTarget.path)
      useEditorTabStore.getState().refreshAllTabs()
      onAfterDelete?.(deleteTarget.path)
    } catch (error) {
      logApiError('Failed to delete', error as Error)
    }

    await dataProvider.reloadDirectory(deleteTarget.parentItemId)
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
