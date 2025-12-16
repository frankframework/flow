import React, { type JSX, useEffect, useRef, useState } from 'react'
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

import useTabStore from '~/stores/tab-store'
import { useProjectStore } from '~/stores/project-store'
import EditorFilesDataProvider from './editor-data-provider'

const TREE_ID = 'editor-files-tree'

function getItemTitle(item: TreeItem<unknown>): string {
  return typeof item.data === 'string' ? item.data : 'Unnamed'
}

export default function EditorFileStructure() {
  const project = useProjectStore((state) => state.project)
  const filepaths = project?.filepaths ?? []

  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)
  const dataProviderReference = useRef(new EditorFilesDataProvider('Configurations', []))

  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    if (!project) return
    dataProviderReference.current.updateData(filepaths)
  }, [filepaths, project])

  useEffect(() => {
    const findMatchingItems = async () => {
      if (!searchTerm || !dataProviderReference.current) {
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        setHighlightedItemId(null)
        return
      }

      const allItems = await dataProviderReference.current.getAllItems()
      const lower = searchTerm.toLowerCase()

      const matches = allItems
        .filter((item) => getItemTitle(item).toLowerCase().includes(lower))
        .map((item) => item.index as string)

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
  }, [searchTerm, filepaths])

  /**
   * Item click → open file tab
   */
  const handleItemClick = async (itemIds: string[]) => {
    if (!dataProviderReference.current || itemIds.length === 0) return

    const item = await dataProviderReference.current.getTreeItem(itemIds[0])
    if (!item || item.isFolder) return

    const filename = item.data as string
    openFileTab(filename)
  }

  /**
   * Keyboard navigation (unchanged)
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        setActiveMatchIndex((i) => (i + 1) % matchingItemIds.length)
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((i) => (i - 1 < 0 ? matchingItemIds.length - 1 : i - 1))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const target = highlightedItemId || matchingItemIds[0]
        if (target) handleItemClick([target])
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClick])

  /**
   * Expand / collapse on search
   */
  useEffect(() => {
    if (!tree.current) return
    searchTerm ? tree.current.expandAll() : tree.current.collapseAll()
  }, [searchTerm])

  const openFileTab = (filename: string) => {
    if (!getTab(filename)) {
      setTabData(filename, {
        value: filename,
        configurationName: filename,
        flowJson: {},
      })
    }
    setActiveTab(filename)
  }

  /**
   * Rendering helpers (mostly unchanged)
   */
  const renderItemArrow = ({ item, context }: { item: TreeItem; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null
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
    item: TreeItem
    context: TreeItemRenderContext
  }) => {
    const Icon = item.isFolder ? (context.isExpanded ? FolderOpenIcon : FolderIcon) : null

    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()

    let highlightedTitle: JSX.Element | string = title
    if (searchTerm && titleLower.includes(searchLower)) {
      const parts = title.split(new RegExp(`(${searchTerm})`, 'gi'))
      highlightedTitle = (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === searchLower ? (
              <mark key={i} className="text-foreground bg-foreground-active rounded-sm">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </>
      )
    }

    const isHighlighted = highlightedItemId === item.index

    return (
      <>
        {Icon && <Icon className="fill-foreground w-4 flex-shrink-0" />}
        <span
          className={`ml-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline outline-2' : ''
          }`}
        >
          {highlightedTitle}
        </span>
      </>
    )
  }

  if (!dataProviderReference.current) return null

  return (
    <>
      <Search onChange={(e) => setSearchTerm(e.target.value)} />
      <div className="overflow-auto pr-2">
        <UncontrolledTreeEnvironment
          viewState={{}}
          getItemTitle={getItemTitle}
          dataProvider={dataProviderReference.current}
          onSelectItems={handleItemClick}
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
