import { type JSX, useEffect, useRef, useState } from 'react'
import { getAdapterNamesFromConfiguration } from '~/routes/builder/xml-to-json-parser'
import useTabStore from '~/stores/tab-store'
import Search from '~/components/search/search'
import FolderIcon from '/icons/solar/Folder.svg?react'
import FolderOpenIcon from '/icons/solar/Folder Open.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import 'react-complex-tree/lib/style-modern.css'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import BuilderFilesDataProvider from '~/routes/builder/builder-files-data-provider'
import { useProjectStore } from '~/stores/project-store'
import { Link } from 'react-router'
import { useTreeStore } from '~/stores/tree-store'
import { useShallow } from 'zustand/react/shallow'

export interface ConfigWithAdapters {
  configName: string
  adapterNames: string[]
}

const TREE_ID = 'builder-files-tree'

function getItemTitle(item: TreeItem<unknown>): string {
  // item.data is either a string (for folders) or object (for leaf nodes)
  if (typeof item.data === 'string') {
    return item.data
  } else if (typeof item.data === 'object' && item.data !== null && 'adapterName' in item.data) {
    return (item.data as { adapterName: string }).adapterName
  }
  return 'Unnamed'
}

export default function BuilderStructure() {
  const { configs, isLoading, setConfigs, setIsLoading } = useTreeStore(
    useShallow((state) => ({
      configs: state.configs,
      isLoading: state.isLoading,
      setConfigs: state.setConfigs,
      setIsLoading: state.setIsLoading,
    })),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)
  const dataProviderReference = useRef(new BuilderFilesDataProvider([]))

  const configurationNames = useProjectStore((state) => state.project?.filenames)
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    const loadAdapters = async () => {
      if (configs.length > 0) {
        // skip fetching if already loaded
        return
      }

      try {
        const loaded: ConfigWithAdapters[] = await Promise.all(
          configurationNames.map(async (configName) => {
            const adapterNames = await getAdapterNamesFromConfiguration(configName)
            return { configName, adapterNames }
          }),
        )
        setConfigs(loaded)
      } catch (error) {
        console.error('Failed to load adapter names:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAdapters()
  }, [configurationNames])

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
        .map((item: TreeItem<unknown>) => item.index)

      setMatchingItemIds(matches)

      // Always reset highlight to the first match (or clear)
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

  // Listener for tab and enter keys
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // ✅ Clear search and highlight
        setSearchTerm('')
        setHighlightedItemId(null)
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        return
      }

      if (matchingItemIds.length === 0) return

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((prev) => (prev + 1) % matchingItemIds.length)
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((prev) => (prev - 1 < 0 ? matchingItemIds.length - 1 : prev - 1))
      } else if (event.key === 'Enter') {
        event.preventDefault()

        // If nothing highlighted yet, select the first match
        const targetItemId = highlightedItemId || matchingItemIds[0]
        if (targetItemId) {
          handleItemClick([targetItemId])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId])



  useEffect(() => {
    if (activeMatchIndex === -1 || !tree.current) return

    const itemId = matchingItemIds[activeMatchIndex]
    if (!itemId) return

    // set visual highlight only
    setHighlightedItemId(itemId)
  }, [activeMatchIndex])

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

  const handleItemClick = async (itemIds: string[]) => {
    if (!dataProviderReference.current || itemIds.length === 0) return

    const itemId = itemIds[0]
    const item = await dataProviderReference.current.getTreeItem(itemId)

    if (!item || item.isFolder) return

    const data = item.data
    if (typeof data === 'object' && data !== null && 'adapterName' in data && 'configName' in data) {
      const { adapterName, configName } = data as { adapterName: string; configName: string }
      openNewTab(adapterName, configName)
    }
  }

  const openNewTab = (adapterName: string, configName: string) => {
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        value: adapterName,
        configurationName: configName,
        flowJson: {},
      })
    }

    setActiveTab(adapterName)
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
    const Icon = (item.isFolder && (context.isExpanded ? FolderOpenIcon : FolderIcon)) || CodeIcon

    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()

    // Highlight only the substring(s) that match the search term
    let highlightedTitle: JSX.Element | string = title

    if (searchTerm && titleLower.includes(searchLower)) {
      const parts = title.split(new RegExp(`(${searchTerm})`, 'gi')) // keep matched pieces
      highlightedTitle = (
        <>
          {parts.map((part, index) =>
            part.toLowerCase() === searchLower ? (
              <mark key={index} className="text-foreground bg-foreground-active rounded-sm">
                {part}
              </mark>
            ) : (
              <span key={index}>{part}</span>
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
          className={`font-inter ml-1 overflow-hidden text-nowrap text-ellipsis ${isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline outline-2' : ''
            }`}
        >
          {highlightedTitle}
        </span>
      </>
    )
  }

  return (
    <>
      <Search onChange={(event) => setSearchTerm(event.target.value)} />
      {isLoading ? (
        <p>Loading configurations...</p>
      ) : configs.length === 0 ? (
        <p className="p-2 text-center">
          No configurations found, load in a project through the&nbsp;
          <Link to="/" className="font-medium text-blue-600 hover:underline">
            dashboard overview
          </Link>
          .
        </p>
      ) : (
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
            <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Builder Files" />
          </UncontrolledTreeEnvironment>
        </div>
      )}
    </>
  )
}
