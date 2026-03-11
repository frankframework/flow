import { useProjectStore } from '~/stores/project-store'
import ConfigurationTile from './configuration-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationTile from './add-configuration-tile'
import { useState, useEffect, useCallback, type ChangeEvent, useMemo } from 'react'
import AddConfigurationModal from './add-configuration-modal'
import LoadingSpinner from '~/components/loading-spinner'
import type { FileTreeNode } from '~/types/filesystem.types'
import { deleteInProject, fetchProjectTree } from '~/services/project-service'
import Button from '~/components/inputs/button'
import Search from '~/components/search/search'
import { toRelativePath } from '~/utils/path-utils'

interface ConfigurationFile {
  path: string
  relativePath: string
  adapterNames: string[]
}

function findConfigurationsDir(node: FileTreeNode | undefined | null): FileTreeNode | null {
  if (!node || !node.path) return null

  const normalizedPath = node.path.replaceAll('\\', '/')

  if (node.type === 'DIRECTORY' && normalizedPath.endsWith('/src/main/configurations')) {
    return node
  }

  if (!node.children) return null

  for (const child of node.children) {
    const found = findConfigurationsDir(child)
    if (found) return found
  }

  return null
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

export default function ConfigurationManager() {
  const currentProject = useProjectStore((state) => state.project)
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [tree, setTree] = useState<FileTreeNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [configurationsDir, setConfigurationsDir] = useState<FileTreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)

  const loadTree = useCallback(
    (signal?: AbortSignal) => {
      if (!currentProject?.name) return
      setIsLoading(true)
      fetchProjectTree(currentProject.name, signal)
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
    [currentProject?.name],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadTree(controller.signal)
    return () => controller.abort()
  }, [loadTree])

  useEffect(() => {
    if (tree) {
      const configDir = findConfigurationsDir(tree)
      setConfigurationsDir(configDir)
    }
  }, [tree])

  const handleConfigAdded = useCallback(() => {
    setShowModal(false)
    loadTree()
  }, [loadTree])

  const handleDelete = async (filepath: string) => {
    if (!currentProject?.name) return
    await deleteInProject(currentProject.name, filepath)
    loadTree()
  }

  const configFiles = useMemo(() => {
    if (!tree || !currentProject) return []

    const configurationDirectory = findConfigurationsDir(tree)
    if (!configurationDirectory) return []

    const xmlFiles = collectXmlFiles(configurationDirectory)
    return xmlFiles.map((file) => {
      const relativePath = toRelativePath(file.path, 'src/main/configurations/') ?? file.name
      return { ...file, relativePath, path: file.path }
    })
  }, [tree, currentProject])

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)

    return () => clearTimeout(handler)
  }, [searchQuery])

  const filesWithAdapters = useMemo((): ConfigurationFile[] => {
    return configFiles
      .filter((file) => file.adapterNames && file.adapterNames.length > 0)
      .map((file) => ({
        path: file.path,
        relativePath: file.relativePath,
        adapterNames: file.adapterNames!,
      }))
  }, [configFiles])

  const filteredConfigurations = useMemo(() => {
    if (!debouncedQuery.trim()) return filesWithAdapters

    const query = debouncedQuery.toLowerCase()

    return filesWithAdapters.filter((file) => {
      const matchesFile = file.relativePath.toLowerCase().includes(query)
      const matchesAdapter = file.adapterNames.some((adapter) => adapter.toLowerCase().includes(query))
      return matchesFile || matchesAdapter
    })
  }, [filesWithAdapters, debouncedQuery])

  if (!currentProject) {
    return (
      <div className="bg-backdrop flex h-full w-full flex-col items-center justify-center p-6">
        <div className="text-muted-foreground mb-4">No project selected.</div>
        <Button onClick={() => navigate('/')} className="bg-background">
          Return to Projects
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

  return (
    <div className="bg-background flex h-full w-full flex-col p-6">
      <div className="hover:text-foreground-active flex w-fit hover:cursor-pointer" onClick={() => navigate('/')}>
        <ArrowLeftIcon className="mb-4 h-6 w-auto fill-current hover:cursor-pointer" />
        <p>Return To Projects</p>
      </div>

      <h1 className="ml-2 text-2xl font-bold">Configuration Manager</h1>
      <div className="mb-4 flex items-center justify-between">
        <p className="ml-2">
          Configurations within <span className="font-bold">{currentProject.name}</span>/src/main/configurations:
        </p>
        <Search value={searchQuery} onChange={handleSearch} />
      </div>

      <div className="border-border bg-backdrop flex flex-wrap gap-4 self-start rounded border p-4">
        {filteredConfigurations.map((file) => (
          <ConfigurationTile
            key={file.path}
            filepath={file.path}
            relativePath={file.relativePath}
            adapterNames={file.adapterNames}
            onDelete={() => handleDelete(file.path)}
          />
        ))}

        <AddConfigurationTile onClick={() => setShowModal(true)} />
      </div>
      <AddConfigurationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleConfigAdded}
        currentProject={currentProject}
        configurationsDirPath={configurationsDir?.path ?? ''}
      />
    </div>
  )
}
