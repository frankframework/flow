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

function findConfigurationsDir(node: FileTreeNode): FileTreeNode | null {
  if (node.type === 'DIRECTORY' && node.path.replaceAll('\\', '/').endsWith('/src/main/configurations')) {
    return node
  }

  if (!node.children) return null

  for (const child of node.children) {
    const found = findConfigurationsDir(child)
    if (found) return found
  }

  return null
}

function collectXmlFiles(node: FileTreeNode): FileTreeNode[] {
  let result: FileTreeNode[] = []

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
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!currentProject) return

    const fetchTree = async () => {
      try {
        const response = await fetch(`/api/projects/${currentProject.name}/tree/configurations`)
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`)
        }

        const tree: FileTreeNode = await response.json()

        // Find configurations directory, which is located at /src/main/configurations
        const configurationDirectory = findConfigurationsDir(tree)
        if (!configurationDirectory) return

        const xmlFiles = collectXmlFiles(configurationDirectory)
        // Compute relative path from configsDir
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
        <p className="ml-2">
          Configurations within <span className="font-bold">{currentProject?.name}</span>/src/main/configurations:
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
      </div>
      <AddConfigurationModal isOpen={showModal} onClose={() => setShowModal(false)} currentProject={currentProject!} />
    </div>
  )
}
