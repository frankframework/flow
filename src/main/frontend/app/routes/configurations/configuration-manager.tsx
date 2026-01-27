import { useProjectStore } from '~/stores/project-store'
import ConfigurationTile from './configuration-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationTile from './add-configuration-tile'
import { useEffect, useState } from 'react'
import AddConfigurationModal from './add-configuration-modal'

export interface FileTreeNode {
  name: string
  path: string
  relativePath: string
  type: 'FILE' | 'DIRECTORY'
  children?: FileTreeNode[]
}

function findConfigurationsDir(node: FileTreeNode | undefined | null): FileTreeNode | null {
  if (!node || !node.path) {
    return null
  }

  // Normalize slashes to avoid OS specific issues
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
  const [configFiles, setConfigFiles] = useState<FileTreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Stop if there is no project to fetch for
    if (!currentProject) return

    const fetchTree = async () => {
      try {
        const response = await fetch(`/api/projects/${currentProject.name}/tree`)

        if (!response.ok) {
          console.warn(`API returned ${response.status} for project tree`)
          // Do not set global error that blocks UI, just log it
          return
        }

        const tree: FileTreeNode = await response.json()
        if (!tree) return

        const configurationDirectory = findConfigurationsDir(tree)

        if (!configurationDirectory) {
          console.warn('Configuration directory not found.')
          return
        }

        const xmlFiles = collectXmlFiles(configurationDirectory)

        const xmlFilesWithRelative = xmlFiles.map((file) => ({
          ...file,
          relativePath: file.path.replace(`${configurationDirectory.path}\\`, '').replaceAll('\\', '/'),
        }))

        setConfigFiles(xmlFilesWithRelative)
      } catch (error) {
        console.error('Failed to load project tree', error)
      }
    }

    fetchTree()
  }, [currentProject])

  // CRASH FIX: Check if project is loaded before rendering main content
  if (!currentProject) {
    return (
      <div className="bg-backdrop flex h-full w-full flex-col items-center justify-center p-6">
        <div className="text-muted-foreground">No project selected. Please return to the dashboard.</div>
        <button
          onClick={() => navigate('/')}
          className="bg-background border-border hover:text-foreground-active mt-4 rounded border px-4 py-2"
        >
          Return to Projects
        </button>
      </div>
    )
  }

  return (
    <div className="bg-backdrop h-full w-full p-6">
      <div className="bg-background border-border h-full w-full rounded border p-6">
        <div
          className="hover:text-foreground-active flex w-fit hover:cursor-pointer"
          onClick={() => {
            navigate('/')
          }}
        >
          <ArrowLeftIcon className="mb-4 h-6 w-auto fill-current hover:cursor-pointer" />
          <p>Return To Projects</p>
        </div>

        {error ? (
          <div className="rounded border border-red-500 bg-red-50 p-4 font-bold text-red-500">
            {error} - Check if the backend is running and the project exists.
          </div>
        ) : (
          <>
            <p className="ml-2">
              Configurations within <span className="font-bold">{currentProject.name}</span>
              /src/main/configurations:
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {configFiles.map((file) => (
                <ConfigurationTile key={file.path} filepath={file.relativePath} />
              ))}

              <AddConfigurationTile
                onClick={() => {
                  setShowModal(true)
                }}
              />
            </div>
          </>
        )}
      </div>
      {/* We can safely pass currentProject here because of the check above */}
      <AddConfigurationModal isOpen={showModal} onClose={() => setShowModal(false)} currentProject={currentProject} />
    </div>
  )
}
