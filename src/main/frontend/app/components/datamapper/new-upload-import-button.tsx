import { useId, useState } from 'react'
import clsx from 'clsx'
import Button from '../inputs/button'

interface SchemaUploadButtonProperties {
  fileType: string
  importFunc: (file: File) => void
}

// Generic import button with visual feedback for uploaded files
function NewUploadImportButton({ fileType, importFunc }: SchemaUploadButtonProperties) {
  const inputId = `UploadImportButton${useId()}`
  const [file, setFile] = useState<File | null>(null)
  // Determine the uploaded file name (for source/target)

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <label
        htmlFor={inputId}
        className={clsx(
          'w-full cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors',
          file && 'border-green-600 bg-green-600 text-white hover:bg-green-500',
          !file && 'border-border bg-backdrop text-foreground hover:bg-hover active:bg-selected',
        )}
      >
        {file ? (
          <span className="flex flex-col items-center gap-1 truncate">
            <span className="text-xs opacity-80">Uploaded</span>
            <span className="max-w-full truncate">{file?.name}</span>
          </span>
        ) : (
          'Upload file'
        )}
      </label>

      <input
        id={inputId}
        type="file"
        accept={fileType}
        className="hidden"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      {file && <Button onClick={() => importFunc(file)}>Upload</Button>}
    </div>
  )
}

export default NewUploadImportButton
