import { useProjectStore } from '~/stores/project-store'
import ConfigurationTile from './configuration-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationTile from './add-configuration-tile'
import { useState, useEffect, useCallback } from 'react'
import AddConfigurationModal from './add-configuration-modal'
import LoadingSpinner from '~/components/loading-spinner'
<<<<<<< fix/peristent-create-configuration
import { fetchProjectTree } from '~/services/project-service'
=======
import Button from '~/components/inputs/button'
>>>>>>> master

export interface FileTreeNode {
  name: string
  path: string
  relativePath: string
  type: 'FILE' | 'DIRECTORY'
  children?: FileTreeNode[]
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

  const handleConfigAdded = useCallback(() => {
    setShowModal(false)
    loadTree()
  }, [loadTree])

  const configFiles = (() => {
    if (!tree) return []

    const configurationDirectory = findConfigurationsDir(tree)
    if (!configurationDirectory) return []

    const xmlFiles = collectXmlFiles(configurationDirectory)
    return xmlFiles.map((file) => ({
      ...file,
      relativePath: file.path.replace(`${configurationDirectory.path}\\`, '').replaceAll('\\', '/'),
      path: file.path,
    }))
  })()

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

      <p className="ml-2">
        Configurations within <span className="font-bold">{currentProject.name}</span>/src/main/configurations:
      </p>
      <div className="bg-backdrop border-border w-full flex-1 overflow-y-auto rounded border p-2">
        <div className="flex flex-wrap gap-4">
          {configFiles.map((file) => (
            <ConfigurationTile key={file.path} filepath={file.path} relativePath={file.relativePath} />
          ))}

          <AddConfigurationTile onClick={() => setShowModal(true)} />
        </div>
      </div>
      <AddConfigurationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleConfigAdded}
        currentProject={currentProject}
      />
    </div>
  )
}
