import React, { type JSX, useEffect, useRef, useState } from 'react'
import useTabStore from '~/stores/tab-store'
import Search from '~/components/search/search'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import 'react-complex-tree/lib/style-modern.css'
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
import FilesDataProvider from '~/components/file-structure/studio-files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { getListenerIcon } from './tree-utilities'
import type { FileNode } from './editor-data-provider'

export interface ConfigWithAdapters {
  configPath: string
  adapters: {
    adapterName: string
    listenerName: string | null
  }[]
}

const TREE_ID = 'studio-files-tree'

function getItemTitle(item: TreeItem<FileNode>): string {
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
  const project = useProjectStore.getState().project
  const [isTreeLoading, setIsTreeLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)
  const dataProviderReference = useRef(new FilesDataProvider(project ? project.name : ''))
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    const loadFileTree = async () => {
      if (!project) return

      setIsTreeLoading(true)

      try {
        // Create a new provider for this project
        const provider = new FilesDataProvider(project.name)
        dataProviderReference.current = provider
      } catch (error) {
        console.error('Failed to load file tree', error)
      } finally {
        setIsTreeLoading(false)
      }
    }

    void loadFileTree()
  }, [project])

  useEffect(() => {
    const findMatchingItems = async () => {
      if (!searchTerm) {
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        setHighlightedItemId(null)
        return
      }

      const allItems = await dataProviderReference.current.getAllItems?.()
      if (!allItems) return

      const lower = searchTerm.toLowerCase()
      const matches = allItems
        .filter((item: TreeItem<FileNode>) => getItemTitle(item).toLowerCase().includes(lower))
        .map((item: TreeItem<FileNode>) => String(item.index))

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
  }, [searchTerm])

  const handleItemClick = (items: TreeItemIndex[], _treeId: string): void => {
    void handleItemClickAsync(items)
  }

  const handleItemClickAsync = async (itemIds: TreeItemIndex[]) => {
    if (!dataProviderReference.current || itemIds.length === 0) return

    const itemId = itemIds[0]
    if (typeof itemId !== 'string') return

    const item = await dataProviderReference.current.getTreeItem(itemId)
    if (!item) return

    if (item.isFolder) {
      await loadFolderContents(item)
      return
    }

    // Leaf node: open adapter
    const data = item.data
    if (typeof data === 'object' && data !== null && 'adapterName' in data && 'configPath' in data) {
      const { adapterName, configPath } = data as { adapterName: string; configPath: string }
      openNewTab(adapterName, configPath)
    }
  }

  const loadFolderContents = async (item: TreeItem<FileNode>) => {
    if (!item.isFolder) return

    const path = item.data.path

    if (path.endsWith('.xml')) {
      // XML configs can contain adapters
      await dataProviderReference.current.loadAdapters(item.index)
    } else {
      // Normal directory
      await dataProviderReference.current.loadDirectory(item.index)
    }
  }

  const openNewTab = (adapterName: string, configPath: string) => {
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        name: adapterName,
        configurationPath: configPath,
        flowJson: {},
      })
    }

    setActiveTab(adapterName)
  }

  // Listener for tab and enter keys
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Clear search and highlight
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

        // If nothing highlighted yet, select the first match
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

    // set visual highlight only
    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

  useEffect(() => {
    // Collapse all folders when no search term is entered
    if (!searchTerm) {
      collapseAllFolders()
      return
    }

    // expand all folders when search term is not empty
    expandAllFolders()
  }, [searchTerm])

  const collapseAllFolders = () => {
    const treeReference = tree.current
    if (!treeReference) return
    treeReference.collapseAll()
  }

  const expandAllFolders = () => {
    const treeReference = tree.current
    if (!treeReference) return
    treeReference.expandAll()
  }

  const renderItemArrow = ({ item, context }: { item: TreeItem<FileNode>; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon

    const handleArrowClick = async (event: React.MouseEvent) => {
      event.stopPropagation() // prevent triggering item click
      await loadFolderContents(item)
      context.toggleExpandedState()
    }

    return (
      <Icon onClick={handleArrowClick} className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground" />
    )
  }

  const renderItemTitle = ({
    title,
    item,
    context,
  }: {
    title: string
    item: TreeItem<FileNode>
    context: TreeItemRenderContext
  }) => {
    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()
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
    // Highlight only the substring(s) that match the search term
    let highlightedTitle: JSX.Element | string = title

    if (searchTerm && titleLower.includes(searchLower)) {
      const parts = title.split(new RegExp(`(${searchTerm})`, 'gi')) // keep matched pieces
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
      <>
        <Icon className="fill-foreground w-4 flex-shrink-0" />
        <span
          className={`font-inter ml-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline outline-2' : ''
          }`}
        >
          {highlightedTitle}
        </span>
      </>
    )
  }

  const renderContent = () => {
    if (!project) {
      return <p>Loading project...</p>
    }

    if (isTreeLoading) {
      return <p>Loading configurations...</p>
    }

    return (
      <div className="overflow-auto pr-2">
        <UncontrolledTreeEnvironment
          viewState={{}}
          getItemTitle={getItemTitle}
          dataProvider={dataProviderReference.current}
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
    )
  }

  return (
    <>
      <Search onChange={(event) => setSearchTerm(event.target.value)} />
      {renderContent()}
    </>
  )
}
