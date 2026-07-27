import React, { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import type { ConfigurationProject } from '~/types/project.types'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import FolderOpenIcon from '../../../icons/solar/Folder Open.svg?react'
import ListDown from '../../../icons/solar/List Down.svg?react'
import '/styles/editor-files.css'
import AltArrowRightIcon from '../../../icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '../../../icons/solar/Alt Arrow Down.svg?react'
import CodeIcon from '../../../icons/solar/Code.svg?react'
import CodeFileIcon from '../../../icons/solar/Code File.svg?react'
import TrashBinIcon from '../../../icons/solar/Trash Bin.svg?react'
import Pen from '../../../icons/solar/Pen.svg?react'
import { useShortcut } from '~/hooks/use-shortcut'
import { useFileWatcher } from '~/hooks/use-file-watcher'
import { getAncestorIds, isVisibleInTree, selectAndReveal, toTreeItemId } from './tree-utilities'
import type { ContextMenuState } from './use-file-tree-context-menu'
import IconButton from '~/components/inputs/icon-button'

import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'

import useEditorTabStore, { type EditorTabData } from '~/stores/editor-tab-store'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'
import EditorFilesDataProvider, { type FileNode } from './editor-data-provider'
import { useFileTreeContextMenu } from './use-file-tree-context-menu'
import FileTreeDialogs from './file-tree-dialogs'
import TreeActionButton from '../inputs/tree-action-button'

const TREE_ID = 'editor-files-tree'

function getItemTitle(item: TreeItem<FileNode>): string {
  return typeof item.data.name === 'string' ? item.data.name : 'Unnamed'
}

export default function EditorFileStructure(): JSX.Element {
  const project = useProjectStore((state): ConfigurationProject | undefined => state.project)
  const { editorExpandedItems, addEditorExpandedItem, removeEditorExpandedItem } = useTreeStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const tree = useRef<TreeRef>(null)

  const setTabData = useEditorTabStore((state): ((tabId: string, data: EditorTabData) => void) => state.setTabData)
  const setActiveTab = useEditorTabStore((state): ((tabId: string) => void) => state.setActiveTab)
  const getTab = useEditorTabStore((state): ((tabId: string) => EditorTabData | undefined) => state.getTab)
  const removeTab = useEditorTabStore((state): ((tabId: string) => void) => state.removeTab)
  const removeTabAndSelectFallback = useEditorTabStore(
    (state): ((tabId: string) => void) => state.removeTabAndSelectFallback,
  )
  const activeTabFilePath = useEditorTabStore((state): string => state.activeTabFilePath)
  const activeTab = useEditorTabStore((state): EditorTabData => state.tabs[state.activeTabFilePath])

  const [dataProvider, setDataProvider] = useState<EditorFilesDataProvider | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<TreeItemIndex | null>(null)
  const [rootPath, setRootPath] = useState<string | null>(null)

  const expandedItemsReference = useRef(editorExpandedItems)

  useEffect((): void => {
    expandedItemsReference.current = editorExpandedItems
  }, [editorExpandedItems])

  useFileWatcher(project?.name ?? null, (): void => {
    if (dataProvider) void dataProvider.reloadDirectory('root')
  })

  useEffect((): void => {
    if (!dataProvider) {
      setRootPath(null)
      return
    }
    void dataProvider.getTreeItem('root').then((root): void => {
      if (root) setRootPath((root.data as FileNode).path)
    })
  }, [dataProvider])

  const activeTabItemId = useMemo(
    (): string | null => (rootPath && activeTabFilePath ? toTreeItemId(activeTabFilePath, rootPath) : null),
    [rootPath, activeTabFilePath],
  )

  const isActiveItemVisible = useMemo(
    (): boolean => isVisibleInTree(activeTabItemId, editorExpandedItems),
    [activeTabItemId, editorExpandedItems],
  )

  const onAfterRename = useCallback(
    (oldPath: string, newName: string): void => {
      const tab = getTab(oldPath)
      if (tab) {
        removeTab(oldPath)
        const lastSeparator = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
        const newPath = oldPath.slice(0, Math.max(0, lastSeparator + 1)) + newName
        setTabData(newPath, { ...tab, name: newName, configurationPath: newPath })
        setActiveTab(newPath)
      }
    },
    [getTab, removeTab, setTabData, setActiveTab],
  )

  const onAfterDelete = useCallback(
    (path: string): void => {
      if (getTab(path)) removeTabAndSelectFallback(path)
    },
    [getTab, removeTabAndSelectFallback],
  )

  const configurationsRootPath = project?.rootPath

  const editorContextMenu = useFileTreeContextMenu({
    projectName: project?.name,
    dataProvider,
    configurationsRootPath,
    onAfterRename,
    onAfterDelete,
  })

  const buildContextForItem = useCallback(
    async (itemId: TreeItemIndex): Promise<ContextMenuState | null> => {
      if (!dataProvider) return null
      const item = await dataProvider.getTreeItem(itemId)
      if (!item) return null
      return {
        position: { x: 0, y: 0 },
        itemId,
        isFolder: item.isFolder ?? false,
        isRoot: item.data.projectRoot ?? false,
        path: item.data.path,
        name: item.data.name,
      }
    },
    [dataProvider],
  )

  const triggerExplorerAction = useCallback(
    (action: (menuState: ContextMenuState) => void, requireSelection: boolean): void => {
      const itemId = selectedItemId ?? (requireSelection ? null : 'root')
      if (!itemId || (itemId === 'root' && requireSelection)) return
      void buildContextForItem(itemId).then((menuState): void => {
        if (menuState) action(menuState)
      })
    },
    [selectedItemId, buildContextForItem],
  )

  const triggerItemAction = useCallback(
    (itemId: TreeItemIndex, action: (menuState: ContextMenuState) => void): void => {
      void buildContextForItem(itemId).then((menuState): void => {
        if (menuState) action(menuState)
      })
    },
    [buildContextForItem],
  )

  const revealActiveFile = useCallback(async (): Promise<void> => {
    if (!dataProvider || !activeTabFilePath || !rootPath || !tree.current) return
    if (activeTab?.type === 'diff') return

    const itemId = toTreeItemId(activeTabFilePath, rootPath)

    for (const ancestorId of getAncestorIds(itemId)) {
      await dataProvider.loadDirectory(ancestorId)
      tree.current.expandItem(ancestorId)
    }

    selectAndReveal(tree.current, itemId)
  }, [dataProvider, activeTabFilePath, rootPath, activeTab])

  useShortcut({
    'explorer.new-file': (): void => triggerExplorerAction(editorContextMenu.handleNewFile, false),
    'explorer.new-folder': (): void => triggerExplorerAction(editorContextMenu.handleNewFolder, false),
    'explorer.rename': (): false | undefined => {
      if (!selectedItemId) return false
      triggerExplorerAction(editorContextMenu.handleRename, true)
    },
    'explorer.delete': (): false | undefined => {
      if (!selectedItemId) return false
      triggerExplorerAction(editorContextMenu.handleDelete, true)
    },
    'explorer.reveal': (): undefined => void revealActiveFile(),
  })

  useEffect((): (() => void) | undefined => {
    if (!project?.name) return

    let isMounted = true

    const initProvider = async (): Promise<void> => {
      const provider = new EditorFilesDataProvider(project.name)
      await provider.init(expandedItemsReference.current)

      if (isMounted) {
        setDataProvider(provider)
      }
    }

    initProvider()

    return (): void => {
      isMounted = false
    }
  }, [project?.name])

  useEffect((): void => {
    const findMatchingItems = async (): Promise<void> => {
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
        .filter((item): boolean => getItemTitle(item).toLowerCase().includes(lower))
        .map((item): string => item.index as string)

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
    (filePath: string, fileName: string): void => {
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
    async (itemIds: TreeItemIndex[]): Promise<void> => {
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

  useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
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
        setActiveMatchIndex((index): number => (index + 1) % matchingItemIds.length)
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        setActiveMatchIndex((index): number => (index < 1 ? matchingItemIds.length : index) - 1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const target = highlightedItemId || matchingItemIds[0]
        if (target) {
          void handleItemClickAsync([target])
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return (): void => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [matchingItemIds, highlightedItemId, handleItemClickAsync])

  useEffect((): void => {
    if (!tree.current) return

    if (searchTerm) {
      tree.current.expandAll()
    } else {
      tree.current.collapseAll()
    }
  }, [searchTerm])

  useEffect((): void => {
    if (activeMatchIndex === -1 || !tree.current) return

    const itemId = matchingItemIds[activeMatchIndex]
    if (!itemId) return

    setHighlightedItemId(itemId)
  }, [activeMatchIndex, matchingItemIds])

  if (!dataProvider) return <LoadingSpinner message="Loading files..." className="p-8" />

  const renderItemArrow = ({
    item,
    context,
  }: {
    item: TreeItem
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
        onContextMenu={(mouseEvent): Promise<void> => editorContextMenu.openContextMenu(mouseEvent, item.index)}
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
    item: TreeItem
    context: TreeItemRenderContext
  }): JSX.Element => {
    const ItemIcon = item.isFolder ? (context.isExpanded ? FolderOpenIcon : FolderIcon) : CodeIcon
    const isRoot = (item.data as { projectRoot?: boolean }).projectRoot ?? false

    const searchLower = searchTerm.toLowerCase()
    const titleLower = title.toLowerCase()

    let highlightedTitle: JSX.Element | string = title

    if (searchTerm && titleLower.includes(searchLower)) {
      const titleParts = title.split(new RegExp(`(${searchTerm})`, 'gi'))
      highlightedTitle = (
        <>
          {titleParts.map((part, partIndex): JSX.Element =>
            part.toLowerCase() === searchLower ? (
              <mark key={partIndex} className="text-foreground bg-foreground-active rounded-sm">
                {part}
              </mark>
            ) : (
              <span key={partIndex}>{part}</span>
            ),
          )}
        </>
      )
    }

    const isHighlighted = highlightedItemId === item.index

    return (
      <div
        className="group/row flex h-full w-full items-center"
        onContextMenu={(mouseEvent): Promise<void> => editorContextMenu.openContextMenu(mouseEvent, item.index)}
      >
        {ItemIcon && <ItemIcon className="fill-foreground w-4 flex-shrink-0" />}
        <span
          className={`ml-1 min-w-0 flex-1 overflow-hidden text-nowrap text-ellipsis ${
            isHighlighted ? 'outline-foreground-active rounded-sm px-1 outline-2' : ''
          }`}
        >
          {highlightedTitle}
        </span>
        <div className="ml-1 hidden items-center gap-0.5 group-hover/row:flex">
          {item.isFolder && (
            <TreeActionButton
              title="New File"
              onAction={(): void => triggerItemAction(item.index, editorContextMenu.handleNewFile)}
            >
              <CodeFileIcon className="fill-foreground-muted group-hover:fill-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {item.isFolder && (
            <TreeActionButton
              title="New Folder"
              onAction={(): void => triggerItemAction(item.index, editorContextMenu.handleNewFolder)}
            >
              <FolderIcon className="fill-foreground-muted group-hover:fill-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {!isRoot && (
            <TreeActionButton
              title="Rename"
              onAction={(): void => triggerItemAction(item.index, editorContextMenu.handleRename)}
            >
              <Pen className="text-foreground-muted group-hover:text-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
          {!isRoot && (
            <TreeActionButton
              title="Delete"
              onAction={(): void => triggerItemAction(item.index, editorContextMenu.handleDelete)}
            >
              <TrashBinIcon className="text-foreground-muted group-hover:text-foreground h-3.5 w-3.5" />
            </TreeActionButton>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border-border flex items-center justify-between border-b px-2 py-1">
        <span className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">Explorer</span>
        <div className="flex items-center gap-0.5">
          <IconButton
            title="Open File Tree to Active Tab"
            disabled={!activeTabFilePath || isActiveItemVisible || activeTab?.type === 'diff'}
            onClick={(): undefined => void revealActiveFile()}
          >
            <ListDown className="fill-foreground-muted group-hover:fill-foreground h-5 w-5" />
          </IconButton>
          <IconButton
            title="New File"
            onClick={(): void => triggerExplorerAction(editorContextMenu.handleNewFile, false)}
          >
            <CodeFileIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
          </IconButton>
          <IconButton
            title="New Folder"
            onClick={(): void => triggerExplorerAction(editorContextMenu.handleNewFolder, false)}
          >
            <FolderIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="mt-2">
        <Search onChange={(changeEvent): void => setSearchTerm(changeEvent.target.value)} />
      </div>
      <div
        className="h-full overflow-auto pr-2"
        onContextMenu={(mouseEvent): void => {
          void editorContextMenu.openContextMenu(mouseEvent, 'root')
        }}
      >
        <UncontrolledTreeEnvironment
          viewState={{
            [TREE_ID]: {
              expandedItems: editorExpandedItems,
            },
          }}
          onExpandItem={async (item): Promise<void> => {
            addEditorExpandedItem(String(item.index))
            if (dataProvider) await dataProvider.loadDirectory(item.index)
          }}
          onCollapseItem={(item): void => {
            removeEditorExpandedItem(String(item.index))
            setSelectedItemId((previous): TreeItemIndex | null =>
              previous && String(previous).startsWith(`${String(item.index)}/`) ? null : previous,
            )
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
        contextMenu={editorContextMenu.contextMenu}
        nameDialog={editorContextMenu.nameDialog}
        deleteTarget={editorContextMenu.deleteTarget}
        onNewFile={editorContextMenu.handleNewFile}
        onNewFolder={editorContextMenu.handleNewFolder}
        onRename={editorContextMenu.handleRename}
        onDelete={editorContextMenu.handleDelete}
        onConfirmDelete={editorContextMenu.confirmDelete}
        onCloseContextMenu={editorContextMenu.closeContextMenu}
        onCloseNameDialog={(): void => editorContextMenu.setNameDialog(null)}
        onCloseDeleteDialog={(): void => editorContextMenu.setDeleteTarget(null)}
      />
    </>
  )
}
