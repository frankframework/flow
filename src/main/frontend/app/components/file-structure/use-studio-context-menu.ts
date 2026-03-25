import { useCallback, useRef, useState } from 'react'
import type { TreeItemIndex } from 'react-complex-tree'
import {
  createFileInProject,
  createFolderInProject,
  renameInProject,
  deleteInProject,
} from '~/services/file-tree-service'
import { createAdapter, renameAdapter, deleteAdapter } from '~/services/adapter-service'
import { clearConfigurationCache } from '~/services/configuration-service'
import useTabStore from '~/stores/tab-store'
import { showErrorToastFrom } from '~/components/toast'
import type { StudioItemData, StudioFolderData, StudioAdapterData } from './studio-files-data-provider'

export type StudioItemType = 'root' | 'folder' | 'configuration' | 'adapter'

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
  onSubmit: (name: string) => void
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

export function detectItemType(data: StudioItemData): StudioItemType {
  if (typeof data === 'string') return 'root'
  if ('adapterName' in data) return 'adapter'
  if ('path' in data && (data as StudioFolderData).path.endsWith('.xml')) return 'configuration'
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
  if (name.includes('.')) return name
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
  if (itemType === 'configuration') {
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

export function useStudioContextMenu({ projectName, dataProvider }: UseStudioContextMenuOptions) {
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

      const itemType = detectItemType(item.data)
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

  const handleNewConfiguration = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Configuration',
        onSubmit: async (name: string) => {
          const fileName = ensureXmlExtension(name)
          try {
            await createFileInProject(projectName, menu.folderPath, fileName)
            await dataProvider.reloadDirectory('root')
          } catch (error) {
            showErrorToastFrom('Failed to create configuration', error)
          }
          setNameDialog(null)
        },
      })
    },
    [projectName, dataProvider, closeContextMenu],
  )

  const handleNewAdapter = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Adapter',
        onSubmit: async (name: string) => {
          try {
            await createAdapter(projectName, name, menu.path)
            await dataProvider.reloadDirectory('root')
          } catch (error) {
            showErrorToastFrom('Failed to create adapter', error)
          }
          setNameDialog(null)
        },
      })
    },
    [projectName, dataProvider, closeContextMenu],
  )

  const handleNewFolder = useCallback(
    (menuState?: StudioContextMenuState) => {
      const menu = resolveMenu(menuState)
      if (!menu || !projectName || !dataProvider) return
      closeContextMenu()

      setNameDialog({
        title: 'New Folder',
        onSubmit: async (name: string) => {
          try {
            await createFolderInProject(projectName, menu.folderPath, name)
            await dataProvider.reloadDirectory('root')
          } catch (error) {
            showErrorToastFrom('Failed to create folder', error)
          }
          setNameDialog(null)
        },
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
            } else {
              const finalName = menu.itemType === 'configuration' ? ensureXmlExtension(newName) : newName
              await renameInProject(projectName, menu.path, finalName)
              clearConfigurationCache(projectName, menu.path)
              const newPath = `${getParentDir(menu.path)}/${finalName}`
              useTabStore.getState().renameTabsForConfig(menu.path, newPath)
            }
            await dataProvider.reloadDirectory('root')
          } catch (error) {
            showErrorToastFrom('Failed to rename', error)
          }
          setNameDialog(null)
        },
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
        await deleteInProject(projectName, deleteTarget.path)
        clearConfigurationCache(projectName, deleteTarget.path)
        useTabStore.getState().removeTabsForConfig(deleteTarget.path)
      }
      await dataProvider.reloadDirectory('root')
    } catch (error) {
      showErrorToastFrom('Failed to delete', error)
    }
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
    handleNewConfiguration,
    handleNewAdapter,
    handleNewFolder,
    handleRename,
    handleDelete,
    confirmDelete,
  }
}
