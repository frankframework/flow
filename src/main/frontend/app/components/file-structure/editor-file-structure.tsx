import React, { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import Search from '~/components/search/search'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import 'react-complex-tree/lib/style-modern.css'
import AltArrowRightIcon from '../../../icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '../../../icons/solar/Alt Arrow Down.svg?react'
import CodeIcon from '../../../icons/solar/Code.svg?react'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'

import useEditorTabStore from '~/stores/editor-tab-store'
import { useProjectStore } from '~/stores/project-store'
import EditorFilesDataProvider, { type FileNode } from './editor-data-provider'

const TREE_ID = 'editor-files-tree'

function getItemTitle(item: TreeItem<FileNode>): string {
  return typeof item.data.name === 'string' ? item.data.name : 'Unnamed'
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

  const setTabData = useEditorTabStore((state) => state.setTabData)
  const setActiveTab = useEditorTabStore((state) => state.setActiveTab)
  const getTab = useEditorTabStore((state) => state.getTab)

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

  const openFileTab = useCallback(
    (filePath: string, fileName: string) => {
      if (!getTab(filePath)) {
        setTabData(filePath, {
          name: fileName,
          configurationPath: filePath,
        })
      }
      setActiveTab(filePath)
    },
    [getTab, setActiveTab, setTabData],
  )

  const handleItemClick = useCallback((items: TreeItemIndex[], _treeId: string): void => {
    void handleItemClickAsync(items)
  }, [])

  const handleItemClickAsync = async (itemIds: TreeItemIndex[]) => {
    if (!dataProviderReference.current || itemIds.length === 0) return

    const itemId = itemIds[0]

    if (typeof itemId !== 'string') return

    const item = await dataProviderReference.current.getTreeItem(itemId)
    if (!item || item.isFolder) return

    const filePath = item.data.path
    const fileName = item.data.name

    openFileTab(filePath, fileName)
  }

  /* Keyboard navigation */
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
        if (target) handleItemClickAsync([target])
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClick])

  /* Expand / collapse on search */
  useEffect(() => {
    if (!tree.current) return

    if (searchTerm) {
      tree.current.expandAll()
    } else {
      tree.current.collapseAll()
    }
  }, [searchTerm])

  useEffect(() => {
    if (activeMatchIndex === -1 || !tree.current) return

    const itemId = matchingItemIds[activeMatchIndex]
    if (!itemId) return

    // set visual highlight only
    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

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
    const Icon = item.isFolder ? (context.isExpanded ? FolderOpenIcon : FolderIcon) : CodeIcon

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
