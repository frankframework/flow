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
import { relativeTo } from '~/utils/path-utils'

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

  const filesWithAdapters = useMemo((): ConfigurationFile[] => {
    return configFiles
      .filter((file) => file.adapterNames && file.adapterNames.length > 0)
      .map((file) => ({
        path: file.path,
        relativePath: file.relativePath,
        adapterNames: file.adapterNames!,
      }))
  }, [configFiles])

  const filteredConfigurationFiles = useMemo(() => {
    if (!debouncedQuery.trim()) return filesWithAdapters

    const query = debouncedQuery.toLowerCase()

    return filesWithAdapters.filter((file) => {
      const matchesFile = file.relativePath.toLowerCase().includes(query)
      const matchesAdapter = file.adapterNames.some((adapter) => adapter.toLowerCase().includes(query))
      return matchesFile || matchesAdapter
    })
  }, [filesWithAdapters, debouncedQuery])

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

  return (
    <div className="bg-background flex h-full w-full flex-col p-6">
      <div className="hover:bg-hover flex w-fit rounded px-4 py-2 hover:cursor-pointer" onClick={() => navigate('/')}>
        <ArrowLeftIcon className="h-6 w-auto fill-current hover:cursor-pointer" />
        <p>Switch configuration</p>
      </div>

      <h1 className="mt-4 ml-2 text-2xl font-bold">Configuration Overview</h1>
      <div className="mb-4 flex items-center justify-between">
        <p className="ml-2">
          Configuration files within <span className="font-bold">{currentConfigurationProject.name}</span>
        </p>
        <Search value={searchQuery} onChange={handleSearch} />
      </div>

      <div className="border-border bg-background flex flex-wrap gap-4 self-start">
        {filteredConfigurationFiles.map((file) => (
          <ConfigurationFileTile
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
        currentConfiguration={currentConfigurationProject}
        configurationsDirPath={tree?.path ?? ''}
      />
    </div>
  )
}
