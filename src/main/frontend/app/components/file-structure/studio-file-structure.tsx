import React, { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IconButton from '~/components/inputs/icon-button'
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
import { useFileWatcher } from '~/hooks/use-file-watcher'
import { getAncestorIds, isVisibleInTree, selectAndReveal, toTreeItemId } from './tree-utilities'
import type { StudioContextMenuState, StudioItemType } from './use-studio-context-menu'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import StudioFilesDataProvider, {
  type StudioItemData,
  type StudioFolderData,
} from '~/components/file-structure/studio-files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'
import { useStudioContextMenu, detectItemType, getItemName, resolveItemPaths } from './use-studio-context-menu'
import StudioFileTreeDialogs from './studio-file-tree-dialogs'
import TreeActionButton from '../inputs/tree-action-button'

const TREE_ID = 'studio-files-tree'

function studioTabItemId(activeTab: string, dataProvider: StudioFilesDataProvider): string | null {
  const firstSeparator = activeTab.indexOf('::')
  if (firstSeparator === -1) return null
  const configPath = activeTab.slice(0, firstSeparator)
  const rest = activeTab.slice(firstSeparator + 2)
  const lastSeparator = rest.lastIndexOf('::')
  const adapterName = lastSeparator === -1 ? rest : rest.slice(0, lastSeparator)
  const position = lastSeparator === -1 ? '0' : rest.slice(lastSeparator + 2)
  return `${toTreeItemId(configPath, dataProvider.getRootPath())}/${adapterName}::${position}`
}

function getItemTitle(item: TreeItem<StudioItemData>): string {
  if (typeof item.data === 'string') {
    return item.data
  }
  if (typeof item.data === 'object' && item.data !== null) {
    if ('adapterName' in item.data) {
      return (item.data as { adapterName: string }).adapterName
    }
    if ('name' in item.data) {
      return (item.data as { name: string }).name
    }
  }
  return 'Unnamed'
}

export default function StudioFileStructure(): JSX.Element {
  const project = useProjectStore((state): ConfigurationProject | undefined => state.project)
  const { studioExpandedItems, addStudioExpandedItem, removeStudioExpandedItem } = useTreeStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)

  const [dataProvider, setDataProvider] = useState<StudioFilesDataProvider | null>(null)
  const [providerLoading, setProviderLoading] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<TreeItemIndex | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<StudioItemType | null>(null)
  const treeContainerReference = useRef<HTMLDivElement>(null)
  const setTabData = useTabStore((state): ((tabId: string, data: TabData) => void) => state.setTabData)
  const setActiveTab = useTabStore((state): ((tabId: string | undefined) => void) => state.setActiveTab)
  const getTab = useTabStore((state): ((tabId: string | undefined) => TabData | undefined) => state.getTab)
  const activeTab = useTabStore((state): string => state.activeTab)

  const activeTabItemId = useMemo(
    (): string | null => (dataProvider && activeTab ? studioTabItemId(activeTab, dataProvider) : null),
    [dataProvider, activeTab],
  )

  const isActiveItemVisible = useMemo(
    (): boolean => isVisibleInTree(activeTabItemId, studioExpandedItems),
    [activeTabItemId, studioExpandedItems],
  )

  const expandedItemsReference = useRef(studioExpandedItems)
  useEffect((): void => {
    expandedItemsReference.current = studioExpandedItems
  }, [studioExpandedItems])

  useFileWatcher(project?.name ?? null, (): void => {
    if (dataProvider) void dataProvider.reloadDirectory('root')
  })

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
    (action: (menuState: StudioContextMenuState) => void, requireSelection: boolean): void => {
      const itemId = requireSelection
        ? selectedItemId
        : ((selectedItemType === 'adapter' ? null : selectedItemId) ?? 'root')

      if (!itemId) return

      void buildContextForItem(itemId).then((menuState): void => {
        if (menuState) action(menuState)
      })
    },
    [selectedItemId, selectedItemType, buildContextForItem],
  )

  const triggerItemAction = useCallback(
    (itemId: TreeItemIndex, action: (menuState: StudioContextMenuState) => void): void => {
      void buildContextForItem(itemId).then((menuState): void => {
        if (menuState) action(menuState)
      })
    },
    [buildContextForItem],
  )

  const revealActiveTab = useCallback(async (): Promise<void> => {
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
    'studio-explorer.new-config': (): void => triggerExplorerAction(studioContextMenu.handleNewConfiguration, false),
    'studio-explorer.new-adapter': (): void => triggerExplorerAction(studioContextMenu.handleNewAdapter, true),
    'studio-explorer.new-folder': (): void => triggerExplorerAction(studioContextMenu.handleNewFolder, false),
    'studio-explorer.rename': (): false | undefined => {
      if (!selectedItemId) return false
      triggerExplorerAction(studioContextMenu.handleRename, true)
    },
    'studio-explorer.delete': (): false | undefined => {
      if (!selectedItemId) return false
      if (!treeContainerReference.current?.contains(document.activeElement)) return false
      triggerExplorerAction(studioContextMenu.handleDelete, true)
    },
    'studio-explorer.reveal': (): undefined => void revealActiveTab(),
  })

  useEffect((): (() => void) | undefined => {
    if (!project) return

    let isMounted = true

    const initProvider = async (): Promise<void> => {
      setProviderLoading(true)

      const provider = new StudioFilesDataProvider(project.name)
      await provider.init(expandedItemsReference.current)

      if (isMounted) {
        setDataProvider(provider)
        setProviderLoading(false)
      }
    }

    initProvider()

    return (): void => {
      isMounted = false
    }
  }, [project])

  useEffect((): void => {
    const findMatchingItems = async (): Promise<void> => {
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
        .filter((item): boolean => getItemTitle(item).toLowerCase().includes(lower))
        .map((item): string => String(item.index))

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
    if (items.length > 0) {
      setSelectedItemId(items[0])
    } else {
      setSelectedItemId(null)
      setSelectedItemType(null)
    }

    void handleItemClickAsync(items)
  }

  const loadFolderContents = useCallback(
    async (item: TreeItem<StudioItemData>): Promise<void> => {
      if (!item.isFolder || !dataProvider) return

      const data = item.data
      if (typeof data !== 'object' || !('path' in data)) return
      const { path } = data

      await (path.endsWith('.xml') ? dataProvider.loadAdapters(item.index) : dataProvider.loadDirectory(item.index))
    },
    [dataProvider],
  )

  const openNewTab = useCallback(
    (adapterName: string, configPath: string, adapterPosition: number): void => {
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
    async (itemIds: TreeItemIndex[]): Promise<void> => {
      if (!dataProvider || itemIds.length === 0) return

      const itemId = itemIds[0]
      if (typeof itemId !== 'string') return

      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      const data = item.data
      setSelectedItemType(detectItemType(data, item.isFolder))

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

  useEffect((): (() => void) => {
    const handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
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
        setActiveMatchIndex((previous): number => (previous + 1) % matchingItemIds.length)
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((previous): number => (previous - 1 < 0 ? matchingItemIds.length - 1 : previous - 1))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const targetItemId = highlightedItemId || matchingItemIds[0]
        if (targetItemId) {
          await handleItemClickAsync([targetItemId])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return (): void => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClickAsync])

  useEffect((): void => {
    if (activeMatchIndex === -1 || !tree.current) return
    const itemId = matchingItemIds[activeMatchIndex]
    if (!itemId) return
    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

  useEffect((): void => {
    if (!tree.current) return
    if (!searchTerm) {
      tree.current.collapseAll()
      return
    }
    tree.current.expandAll()
  }, [searchTerm])

  const renderItemArrow = ({
    item,
    context,
  }: {
    item: TreeItem<StudioItemData>
    context: TreeItemRenderContext
  }): JSX.Element | null => {
    if (!item.isFolder) return null

    const ArrowIcon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon

    return (
      <div
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow"
        onClick={(mouseEvent): void => {
          mouseEvent.stopPropagation()
          context.toggleExpandedState()
        }}
        onContextMenu={(mouseEvent): Promise<void> => studioContextMenu.openContextMenu(mouseEvent, item.index)}
      >
        <ArrowIcon className="fill-foreground" />
      </div>
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
  }): JSX.Element => {
    const listenerType =
      !item.isFolder && typeof item.data === 'object' && item.data && 'listenerName' in item.data
        ? (item.data as { listenerName: string | null }).listenerName
        : null

    const isDataObject = typeof item.data === 'object'
    const pathEndsWithXml = (item.data as Partial<StudioFolderData>).path?.endsWith('.xml') ?? false

    const isRoot = typeof item.data === 'string'
    const isConfigFile = item.isFolder && isDataObject && item.data !== null && pathEndsWithXml
    const isPlainFolder = item.isFolder && !isConfigFile && !isRoot

    let ItemIcon
    if (isConfigFile) {
      ItemIcon = SettingsIcon
    } else if (item.isFolder) {
      ItemIcon = context.isExpanded ? FolderOpenIcon : FolderIcon
    } else {
      ItemIcon = getListenerIcon(listenerType)
    }

    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()

    let highlightedTitle: JSX.Element | string = title

    if (searchTerm && titleLower.includes(searchLower)) {
      const titleParts = title.split(new RegExp(`(${searchTerm})`, 'gi'))
      highlightedTitle = (
        <>
          {titleParts.map((part, partIndex): JSX.Element =>
            part.toLowerCase() === searchLower ? (
              <mark key={`mark-${partIndex}`} className="text-foreground bg-foreground-active rounded-sm">
                {part}
              </mark>
            ) : (
              <span key={`span-${partIndex}`}>{part}</span>
            ),
          )}
        </>
      )
    }

    const isHighlighted = highlightedItemId === item.index

    return (
      <div
        className="group/row flex h-full w-full items-center"
        onContextMenu={(mouseEvent): Promise<void> => studioContextMenu.openContextMenu(mouseEvent, item.index)}
      >
        <ItemIcon className="fill-foreground w-4 shrink-0" />
        <span
          className={`font-inter ml-1 min-w-0 flex-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline' : ''
          }`}
        >
          {highlightedTitle}
        </span>
        <div className="ml-1 hidden items-center gap-0.5 group-hover/row:flex">
          {(isRoot || isPlainFolder) && (
            <TreeActionButton
              title="New Configuration File"
              onAction={(): void => triggerItemAction(item.index, studioContextMenu.handleNewConfiguration)}
            >
              <SettingsIcon className="fill-foreground-muted group-hover:fill-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {(isRoot || isPlainFolder) && (
            <TreeActionButton
              title="New Folder"
              onAction={(): void => triggerItemAction(item.index, studioContextMenu.handleNewFolder)}
            >
              <FolderIcon className="fill-foreground-muted group-hover:fill-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {isConfigFile && (
            <TreeActionButton
              title="New Adapter"
              onAction={(): void => triggerItemAction(item.index, studioContextMenu.handleNewAdapter)}
            >
              <CodeIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
            </TreeActionButton>
          )}
          {!isRoot && (
            <TreeActionButton
              title="Rename"
              onAction={(): void => triggerItemAction(item.index, studioContextMenu.handleRename)}
            >
              <Pen className="text-foreground-muted group-hover:text-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {!isRoot && (
            <TreeActionButton
              title="Delete"
              onAction={(): void => triggerItemAction(item.index, studioContextMenu.handleDelete)}
            >
              <TrashBinIcon className="text-foreground-muted group-hover:text-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
        </div>
      </div>
    )
  }

  if (!project) return <p className="text-foreground-muted p-4 text-sm">No Project Selected</p>
  if (providerLoading) return <LoadingSpinner message="Loading configurations..." className="p-8" />
  if (!dataProvider)
    return <p className="text-foreground-muted p-4 text-sm">No configurations found in src/main/configurations</p>

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between p-4 py-2">
        <span className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">Explorer</span>
        <div className="flex items-center gap-0.5">
          <IconButton
            title="Open File Tree to Active Tab"
            disabled={!activeTab || isActiveItemVisible}
            onClick={(): undefined => void revealActiveTab()}
          >
            <ListDown className="fill-foreground-muted group-hover:fill-foreground h-5 w-5" />
          </IconButton>
          <IconButton
            title="New Configuration File"
            onClick={(): void => triggerExplorerAction(studioContextMenu.handleNewConfiguration, false)}
          >
            <SettingsIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
          </IconButton>
          <IconButton
            title="New Folder"
            onClick={(): void => triggerExplorerAction(studioContextMenu.handleNewFolder, false)}
          >
            <FolderIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <Search onChange={(event): void => setSearchTerm(event.target.value)} />

      <div
        ref={treeContainerReference}
        className="min-h-0 flex-1 overflow-auto pr-2"
        onContextMenu={(mouseEvent): void => {
          void studioContextMenu.openContextMenu(mouseEvent, 'root')
        }}
      >
        <UncontrolledTreeEnvironment
          viewState={{
            [TREE_ID]: {
              expandedItems: studioExpandedItems,
            },
          }}
          onExpandItem={async (item): Promise<void> => {
            addStudioExpandedItem(String(item.index))
            if (dataProvider) await loadFolderContents(item)
          }}
          onCollapseItem={(item): void => {
            removeStudioExpandedItem(String(item.index))
            setSelectedItemId((previous): TreeItemIndex | null =>
              previous && String(previous).startsWith(`${String(item.index)}/`) ? null : previous,
            )
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
        onCloseNameDialog={(): void => studioContextMenu.setNameDialog(null)}
        onCloseDeleteDialog={(): void => studioContextMenu.setDeleteTarget(null)}
      />
    </div>
  )
}
