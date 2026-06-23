import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { TreeItemIndex } from 'react-complex-tree'
import { deleteFile, renameFile } from '~/services/file-service'
import { createFolderInProject } from '~/services/file-tree-service'
import { createAdapter, renameAdapter, deleteAdapter } from '~/services/adapter-service'
import { clearConfigurationFileCache, createConfigurationFile } from '~/services/configuration-file-service'
import useTabStore from '~/stores/tab-store'
import { logApiError } from '~/utils/logger'
import type { StudioItemData, StudioFolderData, StudioAdapterData } from './studio-files-data-provider'
import {
  CONFIGURATION_NAME_PATTERNS,
  FILE_NAME_PATTERNS,
  FOLDER_OR_ADAPTER_NAME_PATTERNS,
} from '~/components/file-structure/name-input-dialog'
import { openInStudio } from '~/actions/navigationActions'

export type StudioItemType = 'root' | 'folder' | 'configuration' | 'adapter' | 'file'

export interface StudioContextMenuState {
  position: { x: number; y: number }
  itemId: TreeItemIndex
  itemType: StudioItemType
  path: string
  folderPath: string
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
  itemType: StudioItemType
  path: string
}

export interface StudioDataProviderLike {
  getTreeItem(itemId: TreeItemIndex): Promise<{ data: StudioItemData; isFolder?: boolean } | undefined>
  reloadDirectory(itemId: TreeItemIndex): Promise<void>
  getRootPath(): string
}

export function detectItemType(data: StudioItemData, isFolder?: boolean): StudioItemType {
  if (typeof data === 'string') return 'root'

  if ('adapterName' in data) return 'adapter'

  if (!('path' in data)) return 'folder'

  const path = (data as StudioFolderData).path
  if (path.endsWith('.xml')) return 'configuration'

  if (isFolder) return 'folder'

  const lastSegment = path.split(/[/\\]/).at(-1) ?? path
  if (lastSegment.includes('.')) return 'file'
  return 'folder'
}

export function getItemName(data: StudioItemData): string {
  if (typeof data === 'string') return data
  if ('adapterName' in data) return (data as StudioAdapterData).adapterName
  if ('name' in data) return (data as StudioFolderData).name
  return 'Unnamed'
}

function getParentDir(filePath: string): string {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return lastSep > 0 ? filePath.slice(0, lastSep) : filePath
}

function ensureXmlExtension(name: string): string {
  if (name.endsWith('.xml')) return name
  return `${name}.xml`
}

export function resolveItemPaths(
  data: StudioItemData,
  itemType: StudioItemType,
  dataProvider: StudioDataProviderLike,
): { path: string; folderPath: string } {
  if (typeof data === 'string') {
    const rootPath = dataProvider.getRootPath()
    return { path: rootPath, folderPath: rootPath }
  }

  if (itemType === 'adapter') {
    const configPath = (data as StudioAdapterData).configPath
    return { path: configPath, folderPath: getParentDir(configPath) }
  }

  const folderData = data as StudioFolderData
  if (itemType === 'configuration' || itemType === 'file') {
    return { path: folderData.path, folderPath: getParentDir(folderData.path) }
  }

  return { path: folderData.path, folderPath: folderData.path }
}

function removeAdapterTab(configPath: string, adapterName: string): void {
  const tabStore = useTabStore.getState()
  const prefix = `${configPath}::${adapterName}::`
  for (const tabId of Object.keys(tabStore.tabs)) {
    if (tabId.startsWith(prefix)) {
      tabStore.removeTabAndSelectFallback(tabId)
    }
  }
}

interface UseStudioContextMenuOptions {
  projectName: string | undefined
  dataProvider: StudioDataProviderLike | null
}

function getRenamePatterns(itemType: StudioItemType): Record<string, RegExp> {
  if (itemType === 'folder' || itemType === 'adapter') return FOLDER_OR_ADAPTER_NAME_PATTERNS
  if (itemType === 'file') return FILE_NAME_PATTERNS
  return CONFIGURATION_NAME_PATTERNS
}

export function useStudioContextMenu({ projectName, dataProvider }: UseStudioContextMenuOptions) {
  const navigate = useNavigate()
  const [contextMenu, setContextMenu] = useState<StudioContextMenuState | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetState | null>(null)
  const contextMenuRef = useRef<StudioContextMenuState | null>(null)

  const openContextMenu = useCallback(
    async (e: React.MouseEvent, itemId: TreeItemIndex) => {
      e.preventDefault()
      e.stopPropagation()
      if (!dataProvider) return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      const itemType = detectItemType(item.data, item.isFolder)
      const name = getItemName(item.data)
      const { path, folderPath } = resolveItemPaths(item.data, itemType, dataProvider)

      const state: StudioContextMenuState = {
        position: { x: e.clientX, y: e.clientY },
        itemId,
        itemType,
        path,
        folderPath,
        name,
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

  function resolveMenu(menuState?: StudioContextMenuState): StudioContextMenuState | null {
    return menuState ?? contextMenuRef.current
  }

  const handleNewConfigurationFile = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Configuration File',
        submitLabel: 'Create',
        onSubmit: async (name: string) => {
          const fileName = ensureXmlExtension(name)
          try {
            const folderPath = menu.folderPath.replace(/[/\\]$/, '')
            const absoluteFilePath = `${folderPath}/${fileName}`
            const { adapterName, adapterPosition } = await createConfigurationFile(projectName, absoluteFilePath)
            await dataProvider.reloadDirectory('root')

            if (adapterName) {
              openInStudio(navigate, { adapterName, filepath: absoluteFilePath, adapterPosition })
            }
          } catch (error) {
            logApiError('Failed to create configuration', error as Error)
          }
          setNameDialog(null)
        },
        patterns: CONFIGURATION_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, navigate, closeContextMenu],
  )

  const handleNewAdapter = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Adapter',
        submitLabel: 'Create',
        onSubmit: async (name: string) => {
          try {
            const { adapterName, adapterPosition } = await createAdapter(projectName, name, menu.path)
            await dataProvider.reloadDirectory('root')

            openInStudio(navigate, { adapterName: adapterName ?? name, filepath: menu.path, adapterPosition })
          } catch (error) {
            logApiError('Failed to create adapter', error as Error)
          }
          setNameDialog(null)
        },
        patterns: FOLDER_OR_ADAPTER_NAME_PATTERNS,
      })
    },
    [projectName, dataProvider, navigate, closeContextMenu],
  )

  const handleNewFolder = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Folder',
        submitLabel: 'Create',
        onSubmit: async (name: string) => {
          try {
            await createFolderInProject(projectName, `${menu.folderPath}/${name}`)
            await dataProvider.reloadDirectory('root')
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
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      const oldName = menu.name
      closeContextMenu()

      setNameDialog({
        title: 'Rename',
        initialValue: oldName,
        onSubmit: async (newName: string) => {
          if (newName === oldName) {
            setNameDialog(null)
            return
          }
          try {
            if (menu.itemType === 'adapter') {
              await renameAdapter(projectName, oldName, newName, menu.path)
            } else if (menu.itemType === 'configuration' || menu.itemType === 'file') {
              const finalName = menu.itemType === 'configuration' ? ensureXmlExtension(newName) : newName
              const newPath = `${menu.folderPath}/${finalName}`
              await renameFile(projectName, menu.path, newPath)
              clearConfigurationFileCache(projectName, menu.path)
              useTabStore.getState().renameTabsForConfig(menu.path, newPath)
            } else {
              await renameFile(projectName, menu.path, `${getParentDir(menu.path)}/${newName}`)
            }
            await dataProvider.reloadDirectory('root')
          } catch (error) {
            logApiError('Failed to rename', error as Error)
          }
          setNameDialog(null)
        },
        patterns: getRenamePatterns(menu.itemType),
      })
    },
    [projectName, dataProvider, closeContextMenu],
  )

  const handleDelete = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu) return
      setDeleteTarget({
        name: menu.name,
        itemType: menu.itemType,
        path: menu.path,
      })
      closeContextMenu()
    },
    [closeContextMenu],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !projectName || !dataProvider) return

    try {
      if (deleteTarget.itemType === 'adapter') {
        await deleteAdapter(projectName, deleteTarget.name, deleteTarget.path)
        removeAdapterTab(deleteTarget.path, deleteTarget.name)
      } else {
        await deleteFile(projectName, deleteTarget.path)
        clearConfigurationFileCache(projectName, deleteTarget.path)
        useTabStore.getState().removeTabsForConfig(deleteTarget.path)
      }
    } catch (error) {
      logApiError('Failed to delete', error as Error)
    }
    await dataProvider.reloadDirectory('root')
    setDeleteTarget(null)
  }, [deleteTarget, projectName, dataProvider])

  return {
    contextMenu,
    setContextMenu,
    closeContextMenu,
    nameDialog,
    setNameDialog,
    deleteTarget,
    setDeleteTarget,
    openContextMenu,
    handleNewConfiguration: handleNewConfigurationFile,
    handleNewAdapter,
    handleNewFolder,
    handleRename,
    handleDelete,
    confirmDelete,
  }
}
