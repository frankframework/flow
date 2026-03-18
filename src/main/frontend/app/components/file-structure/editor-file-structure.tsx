import React, { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import '/styles/editor-files.css'
import AltArrowRightIcon from '../../../icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '../../../icons/solar/Alt Arrow Down.svg?react'
import CodeIcon from '../../../icons/solar/Code.svg?react'
import { useShortcut } from '~/hooks/use-shortcut'
import type { ContextMenuState } from './use-file-tree-context-menu'

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
import { useTreeStore } from '~/stores/tree-store'
import EditorFilesDataProvider, { type FileNode } from './editor-data-provider'
import { useFileTreeContextMenu } from './use-file-tree-context-menu'
import FileTreeDialogs from './file-tree-dialogs'

const TREE_ID = 'editor-files-tree'

function getItemTitle(item: TreeItem<FileNode>): string {
  return typeof item.data.name === 'string' ? item.data.name : 'Unnamed'
}

export default function EditorFileStructure() {
  const project = useProjectStore((state) => state.project)
  const { editorExpandedItems, addEditorExpandedItem, removeEditorExpandedItem } = useTreeStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)

  const setTabData = useEditorTabStore((state) => state.setTabData)
  const setActiveTab = useEditorTabStore((state) => state.setActiveTab)
  const getTab = useEditorTabStore((state) => state.getTab)
  const removeTab = useEditorTabStore((state) => state.removeTab)
  const removeTabAndSelectFallback = useEditorTabStore((state) => state.removeTabAndSelectFallback)

  const [dataProvider, setDataProvider] = useState<EditorFilesDataProvider | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<TreeItemIndex | null>(null)

  const onAfterRename = useCallback(
    (oldPath: string, newName: string) => {
      const tab = getTab(oldPath)
      if (tab) {
        removeTab(oldPath)
        const lastSep = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
        const newPath = oldPath.slice(0, Math.max(0, lastSep + 1)) + newName
        setTabData(newPath, { ...tab, name: newName, configurationPath: newPath })
        setActiveTab(newPath)
      }
    },
    [getTab, removeTab, setTabData, setActiveTab],
  )

  const onAfterDelete = useCallback(
    (path: string) => {
      if (getTab(path)) removeTabAndSelectFallback(path)
    },
    [getTab, removeTabAndSelectFallback],
  )

  const ctxMenu = useFileTreeContextMenu({
    projectName: project?.name,
    dataProvider,
    onAfterRename,
    onAfterDelete,
  })

  const buildContextForItem = useCallback(
    async (itemId: TreeItemIndex): Promise<ContextMenuState | undefined> => {
      if (!dataProvider) return undefined
      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return undefined
      return {
        position: { x: 0, y: 0 },
        itemId,
        isFolder: !!item.isFolder,
        isRoot: !!item.data.projectRoot,
        path: item.data.path,
        name: item.data.name,
      }
    },
    [dataProvider],
  )

  const triggerExplorerAction = useCallback(
    (action: (ctx: ContextMenuState) => void, requireSelection: boolean) => {
      const itemId = selectedItemId ?? (requireSelection ? null : 'root')
      if (!itemId || (itemId === 'root' && requireSelection)) return
      void buildContextForItem(itemId).then((ctx) => {
        if (ctx) action(ctx)
      })
    },
    [selectedItemId, buildContextForItem],
  )

  useShortcut({
    'explorer.new-file': () => triggerExplorerAction(ctxMenu.handleNewFile, false),
    'explorer.new-folder': () => triggerExplorerAction(ctxMenu.handleNewFolder, false),
    'explorer.rename': () => triggerExplorerAction(ctxMenu.handleRename, true),
    'explorer.delete': () => triggerExplorerAction(ctxMenu.handleDelete, true),
    'explorer.delete-mac': () => triggerExplorerAction(ctxMenu.handleDelete, true),
  })

  useEffect(() => {
    if (!project?.name) return

    let isMounted = true

    const initProvider = async () => {
      const provider = new EditorFilesDataProvider(project.name)
      await provider.init(editorExpandedItems)

      if (isMounted) {
        setDataProvider(provider)
      }
    }

    initProvider()

    return () => {
      isMounted = false
    }
  }, [project?.name])

  useEffect(() => {
    const findMatchingItems = async () => {
      if (!dataProvider) return

      if (!searchTerm) {
        setMatchingItemIds([])
        setActiveMatchIndex(-1)
        setHighlightedItemId(null)
        return
      }

      const allItems = await dataProvider.getAllItems()
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
  }, [searchTerm, dataProvider])

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
    [getTab, setTabData, setActiveTab],
  )

  const handleItemClickAsync = useCallback(
    async (itemIds: TreeItemIndex[]) => {
      if (!dataProvider || itemIds.length === 0) return

      const itemId = itemIds[0]
      setSelectedItemId(itemId)
      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return

      if (item.isFolder) {
        return
      }

      openFileTab(item.data.path, item.data.name)
    },
    [dataProvider, openFileTab],
  )

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
        if (target) {
          void handleItemClickAsync([target])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClickAsync])

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

    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

  const renderItemArrow = ({ item, context }: { item: TreeItem; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon

    const handleClick = (event: React.MouseEvent) => {
      event.stopPropagation()
      context.toggleExpandedState()
    }

    return (
      <Icon
        onClick={handleClick}
        onContextMenu={(mouseEvent) => ctxMenu.openContextMenu(mouseEvent, item.index)}
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
      <div
        className="flex h-full w-full cursor-pointer items-center"
        onContextMenu={(e) => ctxMenu.openContextMenu(e, item.index)}
      >
        {Icon && <Icon className="fill-foreground w-4 flex-shrink-0" />}
        <span
          className={`ml-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline-2' : ''
          }`}
        >
          {highlightedTitle}
        </span>
      </div>
    )
  }

  if (!dataProvider) return <LoadingSpinner message="Loading files..." className="p-8" />

  return (
    <>
      <Search onChange={(e) => setSearchTerm(e.target.value)} />
      <div
        className="h-full overflow-auto pr-2"
        onContextMenu={(e) => {
          void ctxMenu.openContextMenu(e, 'root')
        }}
      >
        <UncontrolledTreeEnvironment
          viewState={{
            [TREE_ID]: {
              expandedItems: editorExpandedItems,
            },
          }}
          onExpandItem={async (item) => {
            addEditorExpandedItem(String(item.index))
            if (dataProvider) await dataProvider.loadDirectory(item.index)
          }}
          onCollapseItem={(item) => {
            removeEditorExpandedItem(String(item.index))
          }}
          getItemTitle={getItemTitle}
          dataProvider={dataProvider}
          onSelectItems={handleItemClickAsync}
          canSearch={false}
          renderItemArrow={renderItemArrow}
          renderItemTitle={renderItemTitle}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Files" />
        </UncontrolledTreeEnvironment>
      </div>

      <FileTreeDialogs
        contextMenu={ctxMenu.contextMenu}
        nameDialog={ctxMenu.nameDialog}
        deleteTarget={ctxMenu.deleteTarget}
        onNewFile={ctxMenu.handleNewFile}
        onNewFolder={ctxMenu.handleNewFolder}
        onRename={ctxMenu.handleRename}
        onDelete={ctxMenu.handleDelete}
        onConfirmDelete={ctxMenu.confirmDelete}
        onCloseContextMenu={ctxMenu.closeContextMenu}
        onCloseNameDialog={() => ctxMenu.setNameDialog(null)}
        onCloseDeleteDialog={() => ctxMenu.setDeleteTarget(null)}
      />
    </>
  )
}
