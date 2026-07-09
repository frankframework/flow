import { deleteFile } from '~/services/file-service'
import { useProjectStore } from '~/stores/project-store'
import ConfigurationFileTile from './configuration-file-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import ListIcon from '/icons/solar/List.svg?react'
import WidgetIcon from '/icons/solar/Widget.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationFileTile from './add-configuration-file-tile'
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AddConfigurationFileModal from './add-configuration-file-modal'
import LoadingSpinner from '~/components/loading-spinner'
import type { FileTreeNode } from '~/types/filesystem.types'
import { fetchProjectTree } from '~/services/file-tree-service'
import Button from '~/components/inputs/button'
import Search from '~/components/search/search'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import NonCanvasComponentContext, { type NonCanvasComponentEditorState } from './non-canvas-component-context'
import AdapterContext, { type AdapterEditorState } from './adapter-context'
import NonCanvasComponentPalette from './non-canvas-component-palette'
import AddNonCanvasComponentMenu from './add-non-canvas-component-menu'
import type { NonCanvasComponent } from '~/services/non-canvas-component-service'
import { useNonCanvasComponents } from './use-non-canvas-components'
import { relativeTo } from '~/utils/path-utils'
import { isRootConfiguration } from './configuration-utils'
import IconButton from '~/components/inputs/icon-button'
import { ActiveIconButton } from '~/components/inputs/active-icon-button'

const SIDEBAR_NAME = 'configuration-overview'

type TileView = 'list' | 'grid'

type ConfigurationFile = {
  path: string
  relativePath: string
  adapterNames: string[]
}

function collectXmlFiles(node: FileTreeNode | undefined | null): FileTreeNode[] {
  let result: FileTreeNode[] = []
  if (!node) return result

  if (node.type === 'FILE' && node.name.endsWith('.xml')) {
    result.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      result = [...result, ...collectXmlFiles(child)]
    }
  }

  return result
}

export default function ConfigurationOverview() {
  const currentConfigurationProject = useProjectStore((state) => state.project)
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [tree, setTree] = useState<FileTreeNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [editor, setEditor] = useState<NonCanvasComponentEditorState | null>(null)
  const [adapterEditor, setAdapterEditor] = useState<AdapterEditorState | null>(null)
  const [editorName, setEditorName] = useState('')
  const [addMenuConfigPath, setAddMenuConfigPath] = useState<string | null>(null)
  const [draggedComponentTagName, setDraggedComponentTagName] = useState<string | null>(null)
  const [tileView, setTileView] = useState<TileView>('list')

  const sidebarVisibleBeforeEditRef = useRef(true)

  const setSidebarVisible = useSidebarStore((state) => state.setVisible)
  const getSidebarVisibility = useSidebarStore((state) => state.getVisibility)

  const captureSidebarVisibility = useCallback(() => {
    sidebarVisibleBeforeEditRef.current = getSidebarVisibility(SIDEBAR_NAME)?.[SidebarSide.RIGHT] ?? true
  }, [getSidebarVisibility])

  const openEditor = useCallback(
    (state: NonCanvasComponentEditorState) => {
      setAdapterEditor(null)
      setEditor(state)
      setEditorName(state.initialAttributes?.name ?? '')
      setSidebarVisible(SIDEBAR_NAME, SidebarSide.RIGHT, true)
    },
    [setSidebarVisible],
  )

  const openAdapterEditor = useCallback(
    (state: AdapterEditorState) => {
      setEditor(null)
      setAdapterEditor(state)
      setEditorName(state.adapterName)
      setSidebarVisible(SIDEBAR_NAME, SidebarSide.RIGHT, true)
    },
    [setSidebarVisible],
  )

  const closeEditor = useCallback(() => {
    setEditor(null)
    setAdapterEditor(null)
    setEditorName('')
  }, [])

  const handleAddComponent = useCallback((configPath: string) => {
    setAddMenuConfigPath(configPath)
  }, [])

  const handleSelectComponentType = useCallback(
    (tagName: string) => {
      if (!addMenuConfigPath) return
      captureSidebarVisibility()
      openEditor({ mode: 'add', configPath: addMenuConfigPath, tagName })
      setAddMenuConfigPath(null)
    },
    [addMenuConfigPath, openEditor, captureSidebarVisibility],
  )

  const handleEditComponent = useCallback(
    (configurationPath: string, component: NonCanvasComponent) => {
      captureSidebarVisibility()
      openEditor({
        mode: 'edit',
        configPath: configurationPath,
        tagName: component.tagName,
        index: component.index,
        initialAttributes: component.attributes,
      })
    },
    [openEditor, captureSidebarVisibility],
  )

  const handleConfigureAdapter = useCallback(
    (configurationPath: string, adapterName: string, adapterPosition: number) => {
      openAdapterEditor({ configPath: configurationPath, adapterName, adapterPosition })
    },
    [openAdapterEditor],
  )

  const handleDropComponent = useCallback(
    (configurationPath: string, tagName: string) => {
      captureSidebarVisibility()
      setDraggedComponentTagName(null)
      setSidebarVisible(SIDEBAR_NAME, SidebarSide.RIGHT, false)
      openEditor({ mode: 'add', configPath: configurationPath, tagName })
    },
    [openEditor, setSidebarVisible, captureSidebarVisibility],
  )

  const loadTree = useCallback(
    (signal?: AbortSignal) => {
      if (!currentConfigurationProject?.name) return
      setIsLoading(true)
      fetchProjectTree(currentConfigurationProject.name, signal)
        .then((data) => {
          if (!signal?.aborted) {
            setTree(data)
            setIsLoading(false)
          }
        })
        .catch(() => {
          if (!signal?.aborted) {
            setIsLoading(false)
          }
        })
    },
    [currentConfigurationProject?.name],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadTree(controller.signal)
    return () => controller.abort()
  }, [loadTree])

  const handleConfigAdded = useCallback(() => {
    setShowModal(false)
    loadTree()
  }, [loadTree])

  const handleDelete = async (filepath: string) => {
    if (!currentConfigurationProject?.name) return
    await deleteFile(currentConfigurationProject.name, filepath)
    loadTree()
  }

  const configFiles = useMemo(() => {
    if (!tree || !currentConfigurationProject) return []

    const xmlFiles = collectXmlFiles(tree)
    return xmlFiles.map((file) => {
      const relativePath = relativeTo(tree.path, file.path) || file.name
      return { ...file, relativePath, path: file.path }
    })
  }, [tree, currentConfigurationProject])

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)

    return () => clearTimeout(handler)
  }, [searchQuery])

  const allConfigFiles = useMemo((): ConfigurationFile[] => {
    const files = configFiles.map((file) => ({
      path: file.path,
      relativePath: file.relativePath,
      adapterNames: file.adapterNames ?? [],
    }))

    return files.toSorted((a, b) => {
      const aIsRoot = isRootConfiguration(a.relativePath)
      const bIsRoot = isRootConfiguration(b.relativePath)
      if (aIsRoot === bIsRoot) return 0
      return aIsRoot ? -1 : 1
    })
  }, [configFiles])

  const filteredConfigurationFiles = useMemo(() => {
    if (!debouncedQuery.trim()) return allConfigFiles

    const query = debouncedQuery.toLowerCase()

    return allConfigFiles.filter((file) => {
      const matchesFile = file.relativePath.toLowerCase().includes(query)
      const matchesAdapter = file.adapterNames.some((adapter) => adapter.toLowerCase().includes(query))
      return matchesFile || matchesAdapter
    })
  }, [allConfigFiles, debouncedQuery])

  const configurationPaths = useMemo(() => allConfigFiles.map((file) => file.path), [allConfigFiles])
  const { componentsByPath, loadingByPath, replaceComponents } = useNonCanvasComponents(
    currentConfigurationProject?.name ?? '',
    configurationPaths,
  )

  const handleComponentSaved = useCallback(
    (configurationPath: string, components: NonCanvasComponent[]) => {
      replaceComponents(configurationPath, components)
      closeEditor()
      setSidebarVisible(SIDEBAR_NAME, SidebarSide.RIGHT, sidebarVisibleBeforeEditRef.current)
    },
    [replaceComponents, closeEditor, setSidebarVisible],
  )

  const handleAdapterChanged = useCallback(() => {
    closeEditor()
    loadTree()
  }, [closeEditor, loadTree])

  if (!currentConfigurationProject) {
    return (
      <div className="bg-backdrop flex h-full w-full flex-col items-center justify-center p-6">
        <div className="text-foreground-muted mb-4">No project selected.</div>
        <Button onClick={() => navigate('/')} className="bg-background">
          Select configuration
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-backdrop flex h-full w-full items-center justify-center">
        <LoadingSpinner size="lg" message="Loading configurations..." />
      </div>
    )
  }

  let sidebarTitle = 'Components'
  if (adapterEditor) {
    sidebarTitle = 'Adapter'
  } else if (editor) {
    if (editorName) {
      sidebarTitle = editor.tagName
    } else {
      sidebarTitle = editor.mode === 'add' ? `Add ${editor.tagName}` : editor.tagName
    }
  }

  let sidebarContent
  if (adapterEditor) {
    sidebarContent = (
      <AdapterContext
        key={`adapter:${adapterEditor.configPath}:${adapterEditor.adapterName}:${adapterEditor.adapterPosition}`}
        projectName={currentConfigurationProject.name}
        editor={adapterEditor}
        onSaved={handleAdapterChanged}
        onDeleted={handleAdapterChanged}
        onNameChange={setEditorName}
      />
    )
  } else if (editor) {
    sidebarContent = (
      <NonCanvasComponentContext
        key={`${editor.configPath}:${editor.tagName}:${editor.index ?? 'new'}`}
        projectName={currentConfigurationProject.name}
        editor={editor}
        onSaved={(components) => handleComponentSaved(editor.configPath, components)}
        onClose={closeEditor}
        onNameChange={setEditorName}
      />
    )
  } else {
    sidebarContent = (
      <NonCanvasComponentPalette
        onDragStart={setDraggedComponentTagName}
        onDragEnd={() => setDraggedComponentTagName(null)}
      />
    )
  }

  return (
    <div className="h-full w-full">
      <SidebarLayout name={SIDEBAR_NAME} defaultVisible={[false, true, true]} windowResizeOnChange hideLeft>
        {/* Left slot is intentionally unused; hideLeft keeps its pane hidden. */}
        <></>

        <>
          <div className="bg-background flex">
            <div className="border-b-border flex h-12 grow items-center border-b px-6">
              <div className="flex h-max items-end gap-4">
                <span className="group relative">
                  <IconButton onClick={() => navigate('/')}>
                    <ArrowLeftIcon className="fill-current" />
                  </IconButton>
                  <span className="bg-backdrop text-foreground border-border absolute top-1/2 left-full z-10 ml-2 hidden -translate-y-1/2 rounded border px-2 py-1 text-sm whitespace-nowrap shadow-md group-hover:block">
                    Switch configuration
                  </span>
                </span>
                <h1 className="text-xl font-medium">
                  {currentConfigurationProject.name ?? "Configuration name can't be retrieved"}
                </h1>
              </div>
            </div>
            <SidebarContentClose side={SidebarSide.RIGHT} />
          </div>

          <div className="border-b-border bg-background flex items-center justify-between gap-2 border-b px-6 py-4">
            <Button className="shrink-0" onClick={() => setShowModal(true)}>
              + Add adapter
            </Button>
            <Search className="w-1/2" placeholder="Search file names..." value={searchQuery} onChange={handleSearch} />
            <div>
              <ul className="ml-auto flex gap-1">
                <ActiveIconButton
                  isActive={tileView === 'list'}
                  label="List view"
                  Icon={ListIcon}
                  onClick={() => setTileView('list')}
                />
                <ActiveIconButton
                  isActive={tileView === 'grid'}
                  label="Grid view"
                  Icon={WidgetIcon}
                  onClick={() => setTileView('grid')}
                />
              </ul>
            </div>
          </div>

          <div className="bg-backdrop flex-1 overflow-y-auto p-6">
            <div className="flex w-full flex-wrap justify-center gap-4">
              {filteredConfigurationFiles.map((file) => (
                <ConfigurationFileTile
                  key={file.path}
                  filepath={file.path}
                  relativePath={file.relativePath}
                  adapterNames={file.adapterNames}
                  nonCanvasComponents={componentsByPath[file.path] ?? []}
                  loadingComponents={loadingByPath[file.path] ?? true}
                  draggedTagName={draggedComponentTagName}
                  onDelete={() => handleDelete(file.path)}
                  onAddComponent={handleAddComponent}
                  onEditComponent={handleEditComponent}
                  onConfigureAdapter={handleConfigureAdapter}
                  onDropComponent={handleDropComponent}
                  listViewTile={tileView === 'list'}
                />
              ))}

              <AddConfigurationFileTile onClick={() => setShowModal(true)} />
            </div>

            <AddConfigurationFileModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onSuccess={handleConfigAdded}
              currentConfiguration={currentConfigurationProject}
              configurationsDirPath={tree?.path ?? ''}
            />
          </div>
        </>

        <>
          <SidebarHeader side={SidebarSide.RIGHT} title={sidebarTitle} />
          {sidebarContent}
        </>
      </SidebarLayout>

      <AddNonCanvasComponentMenu
        isOpen={addMenuConfigPath !== null}
        onClose={() => setAddMenuConfigPath(null)}
        onSelect={handleSelectComponentType}
      />
    </div>
  )
}
