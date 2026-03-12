import React, { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import { getListenerIcon } from './tree-utilities'
import useTabStore from '~/stores/tab-store'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import '/styles/editor-files.css'
import AltArrowRightIcon from '../../../icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '../../../icons/solar/Alt Arrow Down.svg?react'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import FilesDataProvider, { type StudioItemData } from '~/components/file-structure/studio-files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'

const TREE_ID = 'studio-files-tree'

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
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    if (!project) return

    let isMounted = true

    const initProvider = async () => {
      setProviderLoading(true)

      const provider = new FilesDataProvider(project.name)
      await provider.init(studioExpandedItems)

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

      if (item.isFolder) {
        return
      }

      const data = item.data
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
        onContextMenu={(e: React.MouseEvent) => e.stopPropagation()}
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

    let Icon
    if (item.isFolder) {
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

    return (
      <div className="flex min-w-0 cursor-pointer items-center">
        <Icon className="fill-foreground w-4 flex-shrink-0" />
        <span
          className={`font-inter ml-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline' : ''
          }`}
        >
          {highlightedTitle}
        </span>
      </div>
    )
  }

  if (!project) return <p className="text-muted-foreground p-4 text-sm">No Project Selected</p>
  if (providerLoading) return <LoadingSpinner message="Loading configurations..." className="p-8" />
  if (!dataProvider)
    return <p className="text-muted-foreground p-4 text-sm">No configurations found in src/main/configurations</p>

  return (
    <>
      <Search onChange={(event) => setSearchTerm(event.target.value)} />
      <div className="overflow-auto pr-2">
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
    </>
  )
}
