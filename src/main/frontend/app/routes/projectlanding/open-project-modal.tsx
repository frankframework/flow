import { useState } from 'react'
import { openProject } from '~/services/project-service'
import FilesystemBrowser from '~/components/filesystem-browser/filesystem-browser'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OpenProjectModal({ isOpen, onClose, onSuccess }: Props) {
  const [selectedPath, setSelectedPath] = useState('')

  if (!isOpen) return null

  const handleOpen = async () => {
    try {
      await openProject(selectedPath)
      onSuccess()
      onClose()
    } catch (error) {
      alert(`Kon project niet openen: ${error}`)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="flex w-[600px] flex-col rounded-lg bg-white shadow-2xl">
        <div className="border-b p-4 font-bold">Project Openen</div>

        <div className="p-4">
          <p className="mb-2 text-xs text-gray-500">Dubbelklik om een map te openen, klik één keer om te selecteren.</p>
          <FilesystemBrowser onPathSelect={setSelectedPath} />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 p-4">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Annuleren
          </button>
          <button
            disabled={!selectedPath}
            onClick={handleOpen}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Project Openen
          </button>
        </div>
      </div>
    </div>
  )
}
