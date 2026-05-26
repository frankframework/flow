import React, { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getListenerIcon } from './tree-utilities'
import useTabStore from '~/stores/tab-store'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import SettingsIcon from '../../../icons/solar/Settings.svg?react'
import ListDown from '../../../icons/solar/List Down.svg?react'
import CodeIcon from '../../../icons/solar/Code.svg?react'
import TrashBinIcon from '../../../icons/solar/Trash Bin.svg?react'
import Pen from '../../../icons/solar/Pen.svg?react'
import '/styles/editor-files.css'
import AltArrowRightIcon from '../../../icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '../../../icons/solar/Alt Arrow Down.svg?react'
import { useShortcut } from '~/hooks/use-shortcut'
import { getAncestorIds, isVisibleInTree, selectAndReveal, toTreeItemId } from './tree-utilities'
import type { StudioContextMenuState } from './use-studio-context-menu'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import FilesDataProvider, {
  type StudioItemData,
  type StudioFolderData,
} from '~/components/file-structure/studio-files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'
import { useStudioContextMenu, detectItemType, getItemName, resolveItemPaths } from './use-studio-context-menu'
import StudioFileTreeDialogs from './studio-file-tree-dialogs'

const TREE_ID = 'studio-files-tree'

function studioTabItemId(activeTab: string, dataProvider: FilesDataProvider): string | null {
  const firstSep = activeTab.indexOf('::')
  if (firstSep === -1) return null
  const configPath = activeTab.slice(0, firstSep)
  const rest = activeTab.slice(firstSep + 2)
  const lastSep = rest.lastIndexOf('::')
  const adapterName = lastSep === -1 ? rest : rest.slice(0, lastSep)
  const position = lastSep === -1 ? '0' : rest.slice(lastSep + 2)
  const rootPath = dataProvider.getRootPath().replace(/[/\\]$/, '')
  return `${toTreeItemId(configPath, rootPath)}/${adapterName}::${position}`
}

function getItemTitle(item: TreeItem<StudioItemData>): string {
  if (typeof item.data === 'string') {
    return item.data
  } else if (typeof item.data === 'object' && item.data !== null) {
    if ('adapterName' in item.data) {
      return (item.data as { adapterName: string }).adapterName
    }
    if ('name' in item.data) {
      return (item.data as { name: string }).name
    }
  }
  return 'Unnamed'
}

export default function StudioFileStructure() {
  const project = useProjectStore((state) => state.project)
  const { studioExpandedItems, addStudioExpandedItem, removeStudioExpandedItem } = useTreeStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)

  const [dataProvider, setDataProvider] = useState<FilesDataProvider | null>(null)
  const [providerLoading, setProviderLoading] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<TreeItemIndex | null>(null)
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)
  const activeTab = useTabStore((state) => state.activeTab)

  const activeTabItemId = useMemo(
    () => (dataProvider && activeTab ? studioTabItemId(activeTab, dataProvider) : null),
    [dataProvider, activeTab],
  )

  const isActiveItemVisible = useMemo(
    () => isVisibleInTree(activeTabItemId, studioExpandedItems),
    [activeTabItemId, studioExpandedItems],
  )

  const expandedItemsRef = useRef(studioExpandedItems)
  useEffect(() => {
    expandedItemsRef.current = studioExpandedItems
  }, [studioExpandedItems])

  const studioContextMenu = useStudioContextMenu({
    projectName: project?.name,
    dataProvider,
  })

  const buildContextForItem = useCallback(
    async (itemId: TreeItemIndex): Promise<StudioContextMenuState | null> => {
      if (!dataProvider) return null
      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return null

      const itemType = detectItemType(item.data, item.isFolder)
      const name = getItemName(item.data)
      const { path, folderPath } = resolveItemPaths(item.data, itemType, dataProvider)

      return { position: { x: 0, y: 0 }, itemId, itemType, path, folderPath, name }
    },
    [dataProvider],
  )

  const triggerExplorerAction = useCallback(
    (action: (menuState: StudioContextMenuState) => void, requireSelection: boolean) => {
      const itemId = selectedItemId ?? (requireSelection ? null : 'root')
      if (!itemId || (itemId === 'root' && requireSelection)) return

      void buildContextForItem(itemId).then((menuState) => {
        if (menuState) action(menuState)
      })
    },
    [selectedItemId, buildContextForItem],
  )

  const triggerItemAction = useCallback(
    (itemId: TreeItemIndex, action: (menuState: StudioContextMenuState) => void) => {
      void buildContextForItem(itemId).then((menuState) => {
        if (menuState) action(menuState)
      })
    },
    [buildContextForItem],
  )

  const revealActiveTab = useCallback(async () => {
    if (!dataProvider || !activeTab || !tree.current) return

    const itemId = studioTabItemId(activeTab, dataProvider)
    if (!itemId) return

    const configItemId = itemId.slice(0, itemId.lastIndexOf('/'))

    await dataProvider.loadAncestorDirectories(configItemId)

    for (const ancestorId of getAncestorIds(configItemId)) {
      tree.current.expandItem(ancestorId)
    }

    dataProvider.loadAdapters(configItemId)
    tree.current.expandItem(configItemId)

    selectAndReveal(tree.current, itemId)
  }, [dataProvider, activeTab])

  useShortcut({
    'studio-explorer.new-config': () => triggerExplorerAction(studioContextMenu.handleNewConfiguration, false),
    'studio-explorer.new-adapter': () => triggerExplorerAction(studioContextMenu.handleNewAdapter, true),
    'studio-explorer.new-folder': () => triggerExplorerAction(studioContextMenu.handleNewFolder, false),
    'studio-explorer.rename': () => {
      if (!selectedItemId) return false
      triggerExplorerAction(studioContextMenu.handleRename, true)
    },
    'studio-explorer.delete': () => {
      if (!selectedItemId) return false
      triggerExplorerAction(studioContextMenu.handleDelete, true)
    },
    'studio-explorer.reveal': () => void revealActiveTab(),
  })

  useEffect(() => {
    if (!project) return

    let isMounted = true

    const initProvider = async () => {
      setProviderLoading(true)

      const provider = new FilesDataProvider(project.name)
      await provider.init(expandedItemsRef.current)

      if (isMounted) {
        setDataProvider(provider)
        setProviderLoading(false)
      }
    }

    initProvider()

    return () => {
      isMounted = false
    }
  }, [project])

  useEffect(() => {
    const findMatchingItems = async () => {
      if (!searchTerm || !dataProvider) {
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        setHighlightedItemId(null)
        return
      }

      const allItems = await dataProvider.getAllItems?.()
      if (!allItems) return

      const lower = searchTerm.toLowerCase()
      const matches = allItems
        .filter((item) => getItemTitle(item).toLowerCase().includes(lower))
        .map((item) => String(item.index))

      setMatchingItemIds(matches)

      if (matches.length > 0) {
        setActiveMatchIndex(0)
        setHighlightedItemId(matches[0])
      } else {
        setActiveMatchIndex(-1)
        setHighlightedItemId(null)
      }
    }

    findMatchingItems()
  }, [searchTerm, dataProvider])

  const handleItemClick = (items: TreeItemIndex[], _treeId: string): void => {
    if (items.length > 0) setSelectedItemId(items[0])
    void handleItemClickAsync(items)
  }

  const loadFolderContents = useCallback(
    async (item: TreeItem<StudioItemData>) => {
      if (!item.isFolder || !dataProvider) return

      const data = item.data
      if (typeof data !== 'object' || !('path' in data)) return
      const { path } = data

      await (path.endsWith('.xml') ? dataProvider.loadAdapters(item.index) : dataProvider.loadDirectory(item.index))
    },
    [dataProvider],
  )

  const openNewTab = useCallback(
    (adapterName: string, configPath: string, adapterPosition: number) => {
      const tabId = `${configPath}::${adapterName}::${adapterPosition}`
      if (!getTab(tabId)) {
        setTabData(tabId, {
          name: adapterName,
          configurationPath: configPath,
          adapterPosition,
          flowJson: {},
        })
      }

      setActiveTab(tabId)
    },
    [getTab, setTabData, setActiveTab],
  )

  const handleItemClickAsync = useCallback(
    async (itemIds: TreeItemIndex[]) => {
      if (!dataProvider || itemIds.length === 0) return

      const itemId = itemIds[0]
      if (typeof itemId !== 'string') return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      const data = item.data

      if (item.isFolder) {
        return
      }

      if (typeof data === 'object' && data !== null && 'adapterName' in data && 'configPath' in data) {
        const { adapterName, configPath, adapterPosition } = data as {
          adapterName: string
          configPath: string
          adapterPosition: number
        }
        openNewTab(adapterName, configPath, adapterPosition ?? 0)
      }
    },
    [dataProvider, openNewTab],
  )

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchTerm('')
        setHighlightedItemId(null)
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        return
      }

      if (matchingItemIds.length === 0) return

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((previous) => (previous + 1) % matchingItemIds.length)
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((previous) => (previous - 1 < 0 ? matchingItemIds.length - 1 : previous - 1))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const targetItemId = highlightedItemId || matchingItemIds[0]
        if (targetItemId) {
          await handleItemClickAsync([targetItemId])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClickAsync])

  useEffect(() => {
    if (activeMatchIndex === -1 || !tree.current) return
    const itemId = matchingItemIds[activeMatchIndex]
    if (!itemId) return
    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

  useEffect(() => {
    if (!tree.current) return
    if (!searchTerm) {
      tree.current.collapseAll()
      return
    }
    tree.current.expandAll()
  }, [searchTerm])

  const renderItemArrow = ({ item, context }: { item: TreeItem<StudioItemData>; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon

    const handleArrowClick = (event: React.MouseEvent) => {
      event.stopPropagation()
      context.toggleExpandedState()
    }

    return (
      <Icon
        onClick={handleArrowClick}
        onContextMenu={(mouseEvent: React.MouseEvent) => studioContextMenu.openContextMenu(mouseEvent, item.index)}
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground"
      />
    )
  }

  const renderItemTitle = ({
    title,
    item,
    context,
  }: {
    title: string
    item: TreeItem<StudioItemData>
    context: TreeItemRenderContext
  }) => {
    const listenerType =
      !item.isFolder && typeof item.data === 'object' && item.data && 'listenerName' in item.data
        ? (item.data as { listenerName: string | null }).listenerName
        : null

    const isObject = typeof item.data === 'object'

    const pathEndsWithXmlExtension = (item.data as Partial<StudioFolderData>).path?.endsWith('.xml') ?? false

    const isRoot = typeof item.data === 'string'
    const isConfigFile = item.isFolder && isObject && item.data !== null && pathEndsWithXmlExtension
    const isPlainFolder = item.isFolder && !isConfigFile && !isRoot

    let Icon
    if (isConfigFile) {
      Icon = SettingsIcon
    } else if (item.isFolder) {
      Icon = context.isExpanded ? FolderOpenIcon : FolderIcon
    } else {
      Icon = getListenerIcon(listenerType)
    }

    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()

    let highlightedTitle: JSX.Element | string = title

    if (searchTerm && titleLower.includes(searchLower)) {
      const parts = title.split(new RegExp(`(${searchTerm})`, 'gi'))
      highlightedTitle = (
        <>
          {parts.map((part, index) =>
            part.toLowerCase() === searchLower ? (
              <mark key={`mark-${index}`} className="text-foreground bg-foreground-active rounded-sm">
                {part}
              </mark>
            ) : (
              <span key={`span-${index}`}>{part}</span>
            ),
          )}
        </>
      )
    }

    const isHighlighted = highlightedItemId == item.index
    const actionBtnClass = 'cursor-pointer rounded p-0.5 hover:bg-hover flex-shrink-0'

    return (
      <div
        className="group/row flex h-full w-full items-center"
        onContextMenu={(mouseEvent) => studioContextMenu.openContextMenu(mouseEvent, item.index)}
      >
        <Icon className="fill-foreground w-4 flex-shrink-0" />
        <span
          className={`font-inter ml-1 min-w-0 flex-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline' : ''
          }`}
        >
          {highlightedTitle}
        </span>
        <div className="ml-1 hidden items-center gap-0.5 group-hover/row:flex">
          {(isRoot || isPlainFolder) && (
            <div
              role="button"
              tabIndex={0}
              className={actionBtnClass}
              title="New Configuration File"
              onClick={(mouseEvent) => {
                mouseEvent.stopPropagation()
                triggerItemAction(item.index, studioContextMenu.handleNewConfiguration)
              }}
              onKeyDown={(keyboardEvent) =>
                keyboardEvent.key === 'Enter' && triggerItemAction(item.index, studioContextMenu.handleNewConfiguration)
              }
            >
              <SettingsIcon className="fill-foreground h-3.5 w-3.5" />
            </div>
          )}
          {(isRoot || isPlainFolder) && (
            <div
              role="button"
              tabIndex={0}
              className={actionBtnClass}
              title="New Folder"
              onClick={(mouseEvent) => {
                mouseEvent.stopPropagation()
                triggerItemAction(item.index, studioContextMenu.handleNewFolder)
              }}
              onKeyDown={(keyboardEvent) =>
                keyboardEvent.key === 'Enter' && triggerItemAction(item.index, studioContextMenu.handleNewFolder)
              }
            >
              <FolderIcon className="fill-foreground h-3.5 w-3.5" />
            </div>
          )}
          {isConfigFile && (
            <div
              role="button"
              tabIndex={0}
              className={actionBtnClass}
              title="New Adapter"
              onClick={(mouseEvent) => {
                mouseEvent.stopPropagation()
                triggerItemAction(item.index, studioContextMenu.handleNewAdapter)
              }}
              onKeyDown={(keyboardEvent) =>
                keyboardEvent.key === 'Enter' && triggerItemAction(item.index, studioContextMenu.handleNewAdapter)
              }
            >
              <CodeIcon className="fill-foreground h-4 w-4" />
            </div>
          )}
          {!isRoot && (
            <div
              role="button"
              tabIndex={0}
              className={actionBtnClass}
              title="Rename"
              onClick={(mouseEvent) => {
                mouseEvent.stopPropagation()
                triggerItemAction(item.index, studioContextMenu.handleRename)
              }}
              onKeyDown={(keyboardEvent) =>
                keyboardEvent.key === 'Enter' && triggerItemAction(item.index, studioContextMenu.handleRename)
              }
            >
              <Pen className="stroke-foreground h-3.5 w-3.5" />
            </div>
          )}
          {!isRoot && (
            <div
              role="button"
              tabIndex={0}
              className={actionBtnClass}
              title="Delete"
              onClick={(mouseEvent) => {
                mouseEvent.stopPropagation()
                triggerItemAction(item.index, studioContextMenu.handleDelete)
              }}
              onKeyDown={(keyboardEvent) =>
                keyboardEvent.key === 'Enter' && triggerItemAction(item.index, studioContextMenu.handleDelete)
              }
            >
              <TrashBinIcon className="fill-foreground h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!project) return <p className="text-muted-foreground p-4 text-sm">No Project Selected</p>
  if (providerLoading) return <LoadingSpinner message="Loading configurations..." className="p-8" />
  if (!dataProvider)
    return <p className="text-muted-foreground p-4 text-sm">No configurations found in src/main/configurations</p>

  const toolbarBtnClass = 'cursor-pointer rounded p-1 hover:bg-hover text-foreground'

  return (
    <>
      <div className="border-border flex items-center justify-between border-b px-2 py-1">
        <span className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            className={`${toolbarBtnClass} ${!activeTab || isActiveItemVisible ? 'cursor-not-allowed opacity-40' : ''}`}
            title="Open File Tree to Active Tab"
            disabled={!activeTab || isActiveItemVisible}
            onClick={() => void revealActiveTab()}
          >
            <ListDown className="fill-foreground h-5 w-5" />
          </button>
          <button
            className={toolbarBtnClass}
            title="New Configuration File"
            onClick={() => triggerExplorerAction(studioContextMenu.handleNewConfiguration, false)}
          >
            <SettingsIcon className="fill-foreground h-4 w-4" />
          </button>
          <button
            className={toolbarBtnClass}
            title="New Folder"
            onClick={() => triggerExplorerAction(studioContextMenu.handleNewFolder, false)}
          >
            <FolderIcon className="fill-foreground h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2">
        <Search onChange={(event) => setSearchTerm(event.target.value)} />
      </div>
      <div
        className="h-full overflow-auto pr-2"
        onContextMenu={(e) => {
          void studioContextMenu.openContextMenu(e, 'root')
        }}
      >
        <UncontrolledTreeEnvironment
          viewState={{
            [TREE_ID]: {
              expandedItems: studioExpandedItems,
            },
          }}
          onExpandItem={async (item) => {
            addStudioExpandedItem(String(item.index))
            if (dataProvider) await loadFolderContents(item)
          }}
          onCollapseItem={(item) => {
            removeStudioExpandedItem(String(item.index))
            setSelectedItemId((prev) => (prev && String(prev).startsWith(`${String(item.index)}/`) ? null : prev))
          }}
          getItemTitle={getItemTitle}
          dataProvider={dataProvider}
          onSelectItems={handleItemClick}
          canDragAndDrop={true}
          canDropOnFolder={true}
          canSearch={false}
          renderItemArrow={renderItemArrow}
          renderItemTitle={renderItemTitle}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Files" />
        </UncontrolledTreeEnvironment>
      </div>

      <StudioFileTreeDialogs
        contextMenu={studioContextMenu.contextMenu}
        nameDialog={studioContextMenu.nameDialog}
        deleteTarget={studioContextMenu.deleteTarget}
        onNewConfiguration={studioContextMenu.handleNewConfiguration}
        onNewAdapter={studioContextMenu.handleNewAdapter}
        onNewFolder={studioContextMenu.handleNewFolder}
        onRename={studioContextMenu.handleRename}
        onDelete={studioContextMenu.handleDelete}
        onConfirmDelete={studioContextMenu.confirmDelete}
        onCloseContextMenu={studioContextMenu.closeContextMenu}
        onCloseNameDialog={() => studioContextMenu.setNameDialog(null)}
        onCloseDeleteDialog={() => studioContextMenu.setDeleteTarget(null)}
      />
    </>
  )
}
