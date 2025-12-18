import React, { type JSX, useEffect, useRef, useState } from 'react'
import { getAdapterListenerType, getAdapterNamesFromConfiguration } from '~/routes/studio/xml-to-json-parser'
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
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import FilesDataProvider from '~/components/file-structure/files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { Link } from 'react-router'
import { useTreeStore } from '~/stores/tree-store'
import { useShallow } from 'zustand/react/shallow'
import { getListenerIcon } from './tree-utilities'

export interface ConfigWithAdapters {
  configPath: string
  adapters: {
    adapterName: string
    listenerName: string | null
  }[]
}

const TREE_ID = 'studio-files-tree'

function getItemTitle(item: TreeItem<unknown>): string {
  // item.data is either a string (for folders) or object (for leaf nodes)
  if (typeof item.data === 'string') {
    return item.data
  } else if (typeof item.data === 'object' && item.data !== null && 'adapterName' in item.data) {
    return (item.data as { adapterName: string }).adapterName
  }
  return 'Unnamed'
}

export default function FileStructure() {
  const { configs, isLoading, setConfigs, setIsLoading } = useTreeStore(
    useShallow((state) => ({
      configs: state.configs,
      isLoading: state.isLoading,
      setConfigs: state.setConfigs,
      setIsLoading: state.setIsLoading,
    })),
  )
  const project = useProjectStore.getState().project
  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)
  const dataProviderReference = useRef(new FilesDataProvider([]))

  const configurationPaths = useProjectStore((state) => state.project?.filepaths)
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    const loadAdapters = async () => {
      if (configs.length > 0 || !configurationPaths) return

      // eslint-disable-next-line unicorn/consistent-function-scoping
      const fetchAdapter = async (configPath: string, adapterName: string) => {
        if (!project) return { adapterName, listenerName: null }
        const listenerName = await getAdapterListenerType(project.name, configPath, adapterName)
        return { adapterName, listenerName }
      }

      const fetchConfig = async (configPath: string): Promise<ConfigWithAdapters> => {
        if (!project) return { configPath, adapters: [] }

        const adapterNames = await getAdapterNamesFromConfiguration(project.name, configPath)
        const adapters = await Promise.all(adapterNames.map((adapterName) => fetchAdapter(configPath, adapterName)))
        return { configPath, adapters }
      }

      try {
        const loaded = await Promise.all(configurationPaths.map((path) => fetchConfig(path)))
        setConfigs(loaded)
      } catch (error) {
        console.error('Failed to load adapter names:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAdapters()
  }, [configurationPaths, configs.length, setConfigs, setIsLoading, project])

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
        .filter((item: TreeItem<unknown>) => getItemTitle(item).toLowerCase().includes(lower))
        .map((item: TreeItem<unknown>) => String(item.index))

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
  }, [searchTerm, configs])

  useEffect(() => {
    dataProviderReference.current.updateData(configs)
  }, [configs])

  const handleItemClick = async (itemIds: string[]) => {
    if (!dataProviderReference.current || itemIds.length === 0) return

    const itemId = itemIds[0]
    const item = await dataProviderReference.current.getTreeItem(itemId)

    if (!item || item.isFolder) return

    const data = item.data
    if (typeof data === 'object' && data !== null && 'adapterName' in data && 'configPath' in data) {
      const { adapterName, configPath } = data as { adapterName: string; configPath: string }
      openNewTab(adapterName, configPath)
    }
  }

  const openNewTab = (adapterName: string, configPath: string) => {
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        value: adapterName,
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
          await handleItemClick([targetItemId])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClick])

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

  const renderItemArrow = ({ item, context }: { item: TreeItem<unknown>; context: TreeItemRenderContext }) => {
    if (!item.isFolder) {
      return null
    }
    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
    return (
      <Icon
        onClick={context.toggleExpandedState}
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
    item: TreeItem<unknown>
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
    if (isLoading) {
      return <p>Loading configurations...</p>
    }

    if (configs.length === 0) {
      return (
        <p className="p-2 text-center">
          No configurations found, load in a project through the&nbsp;
          <Link to="/" className="font-medium text-blue-600 hover:underline">
            dashboard overview
          </Link>
          .
        </p>
      )
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
