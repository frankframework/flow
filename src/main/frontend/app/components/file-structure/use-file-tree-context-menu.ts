import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { TreeItemIndex } from 'react-complex-tree'
import useToasts from '~/components/toast/use-toasts'
import { createFile, deleteFile, renameFile } from '~/services/file-service'
import { createFolderInProject } from '~/services/file-tree-service'
import { clearConfigurationFileCache, createConfigurationFile } from '~/services/configuration-file-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { FILE_NAME_PATTERNS, FOLDER_OR_ADAPTER_NAME_PATTERNS } from '~/components/file-structure/name-input-dialog'
import { openInEditor } from '~/actions/navigationActions'

export type ContextMenuState = {
  position: { x: number; y: number }
  itemId: TreeItemIndex
  isFolder: boolean
  isRoot: boolean
  path: string
  name: string
}

export type NameDialogState = {
  title: string
  initialValue?: string
  submitLabel?: string
  onSubmit: (name: string) => void
  patterns?: Record<string, RegExp>
}

export type DeleteTargetState = {
  name: string
  path: string
  isFolder: boolean
  parentItemId: TreeItemIndex
}

export type DataProviderLike = {
  getTreeItem(
    itemId: TreeItemIndex,
  ): Promise<{ data: { path: string; name: string; projectRoot?: boolean }; isFolder?: boolean } | undefined>
  reloadDirectory(itemId: TreeItemIndex): Promise<void>
}

type UseFileTreeContextMenuOptions = {
  projectName: string | undefined
  dataProvider: DataProviderLike | null
  configurationsRootPath?: string
  onAfterRename?: (oldPath: string, newName: string) => void
  onAfterDelete?: (path: string) => void
}

const ALLOWED_EXTENSIONS = ['.xml', '.json', '.yaml', '.yml', '.properties']

export function getParentItemId(itemId: TreeItemIndex): TreeItemIndex {
  const string_ = String(itemId)
  const lastSlash = string_.lastIndexOf('/')
  return lastSlash > 0 ? string_.slice(0, Math.max(0, lastSlash)) : 'root'
}

function ensureHasCorrectExtension(name: string): boolean {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return false
  const extension = name.slice(dotIndex)
  return ALLOWED_EXTENSIONS.includes(extension.toLowerCase())
}

function buildNewPath(oldPath: string, newName: string): string {
  const lastSeparator = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
  return oldPath.slice(0, Math.max(0, lastSeparator + 1)) + newName
}

export function useFileTreeContextMenu({
  projectName,
  dataProvider,
  configurationsRootPath,
  onAfterRename,
  onAfterDelete,
}: UseFileTreeContextMenuOptions): {
  contextMenu: ContextMenuState | null
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>
  closeContextMenu: () => void
  nameDialog: NameDialogState | null
  setNameDialog: React.Dispatch<React.SetStateAction<NameDialogState | null>>
  deleteTarget: DeleteTargetState | null
  setDeleteTarget: React.Dispatch<React.SetStateAction<DeleteTargetState | null>>
  openContextMenu: (event: React.MouseEvent, itemId: TreeItemIndex) => Promise<void>
  handleNewFile: (menuState?: ContextMenuState) => void
  handleNewFolder: (menuState?: ContextMenuState) => void
  handleRename: (menuState?: ContextMenuState) => void
  handleDelete: (menuState?: ContextMenuState) => void
  confirmDelete: () => Promise<void>
} {
  const navigate = useNavigate()
  const { showErrorToast, logApiError } = useToasts()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetState | null>(null)
  const contextMenuReference = useRef<ContextMenuState | null>(null)

  const openContextMenu = useCallback(
    async (event: React.MouseEvent, itemId: TreeItemIndex): Promise<void> => {
      event.preventDefault()
      event.stopPropagation()
      if (!dataProvider) return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      const state: ContextMenuState = {
        position: { x: event.clientX, y: event.clientY },
        itemId,
        isFolder: !!item.isFolder,
        isRoot: !!item.data.projectRoot,
        path: item.data.path,
        name: item.data.name,
      }
      contextMenuReference.current = state
      setContextMenu(state)
    },
    [dataProvider],
  )

  const closeContextMenu = useCallback((): void => {
    contextMenuReference.current = null
    setContextMenu(null)
  }, [])

  function resolveMenu(menuState?: ContextMenuState): ContextMenuState | null {
    return menuState ?? contextMenuReference.current
  }

  const handleNewFile = useCallback(
    (menuState?: ContextMenuState): void => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.isFolder ? menu.path : buildNewPath(menu.path, '').slice(0, -1)
      const parentItemId = menu.isFolder ? menu.itemId : getParentItemId(menu.itemId)
      closeContextMenu()

      setNameDialog({
        title: 'New File',
        submitLabel: 'Create',
        onSubmit: async (name: string): Promise<void> => {
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
    [projectName, dataProvider, closeContextMenu, configurationsRootPath, showErrorToast, navigate, logApiError],
  )

  const handleNewFolder = useCallback(
    (menuState?: ContextMenuState): void => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const parentPath = menu.isFolder ? menu.path : buildNewPath(menu.path, '').slice(0, -1)
      const parentItemId = menu.isFolder ? menu.itemId : getParentItemId(menu.itemId)
      closeContextMenu()

      setNameDialog({
        title: 'New Folder',
        submitLabel: 'Create',
        onSubmit: async (name: string): Promise<void> => {
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
    [projectName, dataProvider, closeContextMenu, logApiError],
  )

  const handleRename = useCallback(
    (menuState?: ContextMenuState): void => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const itemId = menu.itemId
      const oldName = menu.name
      const oldPath = menu.path
      closeContextMenu()

      setNameDialog({
        title: 'Rename',
        initialValue: oldName,
        onSubmit: async (newName: string): Promise<void> => {
          if (newName === oldName) {
            setNameDialog(null)
            return
          }
          if (!menu.isFolder && !ensureHasCorrectExtension(newName)) {
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
    [projectName, dataProvider, closeContextMenu, showErrorToast, onAfterRename],
  )

  const handleDelete = useCallback(
    (menuState?: ContextMenuState): void => {
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

  const confirmDelete = useCallback(async (): Promise<void> => {
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
  }, [deleteTarget, projectName, dataProvider, onAfterDelete, logApiError])

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
