import { deleteFile } from '~/services/file-service'
import { useProjectStore } from '~/stores/project-store'
import ConfigurationFileTile from './configuration-file-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationTile from './add-configuration-tile'
import { useState, useEffect, useCallback, type ChangeEvent, useMemo } from 'react'
import AddConfigurationModal from './add-configuration-modal'
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

const SIDEBAR_NAME = 'configuration-overview-v2'

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

  const setSidebarVisible = useSidebarStore((state) => state.setVisible)

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
      openEditor({ mode: 'add', configPath: addMenuConfigPath, tagName })
      setAddMenuConfigPath(null)
    },
    [addMenuConfigPath, openEditor],
  )

  const handleEditComponent = useCallback(
    (configurationPath: string, component: NonCanvasComponent) => {
      openEditor({
        mode: 'edit',
        configPath: configurationPath,
        tagName: component.tagName,
        index: component.index,
        initialAttributes: component.attributes,
      })
    },
    [openEditor],
  )

  const handleConfigureAdapter = useCallback(
    (configurationPath: string, adapterName: string, adapterPosition: number) => {
      openAdapterEditor({ configPath: configurationPath, adapterName, adapterPosition })
    },
    [openAdapterEditor],
  )

  const handleDropComponent = useCallback(
    (configurationPath: string, tagName: string) => {
      openEditor({ mode: 'add', configPath: configurationPath, tagName })
    },
    [openEditor],
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
    },
    [replaceComponents, closeEditor],
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
    sidebarTitle = editorName ? `Adapter · ${editorName}` : 'Adapter'
  } else if (editor) {
    if (editorName) {
      sidebarTitle = `${editor.tagName} · ${editorName}`
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

        <div className="bg-background flex h-full w-full flex-col">
          <div className="border-b-border flex h-12 shrink-0 items-center justify-between border-b">
            <div
              className="hover:bg-hover ms-4 flex cursor-pointer items-center gap-2 rounded py-1 ps-1 pe-2"
              onClick={() => navigate('/')}
            >
              <ArrowLeftIcon className="h-5 w-auto fill-current" />
              <span>Switch configuration</span>
            </div>
            <SidebarContentClose side={SidebarSide.RIGHT} />
          </div>

          <div className="border-b-border grid shrink-0 grid-cols-4 items-center border-b px-4 py-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Configuration Overview</h1>
              <p className="text-foreground-muted text-sm">
                Configuration files within{' '}
                <span className="text-foreground font-bold">{currentConfigurationProject.name}</span>
              </p>
            </div>
            <div className="col-span-2 flex justify-center">
              <Search className="w-full" value={searchQuery} onChange={handleSearch} />
            </div>
            <div />
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex w-full flex-col gap-4">
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
                />
              ))}

              <AddConfigurationTile onClick={() => setShowModal(true)} />
            </div>

            <AddConfigurationModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onSuccess={handleConfigAdded}
              currentConfiguration={currentConfigurationProject}
              configurationsDirPath={tree?.path ?? ''}
            />
          </div>
        </div>

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
