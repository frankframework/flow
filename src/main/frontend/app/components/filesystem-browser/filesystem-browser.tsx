import { useState, useEffect } from 'react'
import FolderIcon from '/icons/solar/Folder.svg?react'
import { type FilesystemEntry, filesystemService } from '~/services/filesystem-service' // Check of dit pad werkt

interface Props {
  onPathSelect: (path: string) => void
}

export default function FilesystemBrowser({ onPathSelect }: Props) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState<FilesystemEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFolder(currentPath)
  }, [currentPath])

  const loadFolder = async (path: string) => {
    setLoading(true)
    try {
      const data = await filesystemService.browse(path)
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  const handleDoubleClick = (entry: FilesystemEntry) => {
    setCurrentPath(entry.absolutePath)
    onPathSelect(entry.absolutePath)
  }

  const goUp = () => {
    // Simpele logica om een niveau omhoog te gaan in het pad
    const parts = currentPath.split(/[\\/]/).filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/') || '')
  }

  return (
    <div className="flex h-[350px] flex-col rounded border bg-white text-sm">
      {/* Adresbalk */}
      <div className="flex items-center gap-2 border-b bg-gray-50 p-2">
        <button onClick={goUp} className="rounded border px-2 py-1 hover:bg-gray-200">
          ↑
        </button>
        <div className="flex-1 truncate rounded border bg-white px-2 py-1 font-mono text-xs">
          {currentPath || 'Deze Computer'}
        </div>
      </div>

      {/* Mappenlijst */}
      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <p className="p-4 text-gray-400 italic">Laden...</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.absolutePath}
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onClick={() => onPathSelect(entry.absolutePath)}
                  className="group cursor-default hover:bg-blue-50"
                >
                  <td className="w-6 p-1">
                    <FolderIcon className="h-4 w-4 fill-current text-yellow-500" />
                  </td>
                  <td className="truncate p-1">{entry.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
