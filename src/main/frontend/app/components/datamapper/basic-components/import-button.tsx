import { useId } from 'react'
import clsx from 'clsx'
import Button from '../../inputs/button'
import { showErrorToast } from '../../toast'

interface ImportButtonProperties {
  fileType: string
  importFunc: (file: File) => void
  file: File | null
  setFile: (file: File | null) => void
}

// Generic import button with visual feedback for uploaded files
function ImportButton({ fileType, importFunc, file, setFile }: ImportButtonProperties) {
  const inputId = `UploadImportButton${useId()}`

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <label
        htmlFor={inputId}
        className={clsx(
          'w-full cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors',
          file && 'border-green-600 bg-green-600 text-white hover:bg-green-500',
          !file && 'border-border bg-backdrop text-foreground hover:bg-hover active:bg-selected',
        )}
      >
        {file ? (
          <span className="flex flex-col items-center truncate">
            <span className="text-xs opacity-80">Uploaded</span>
            <span className="max-w-full truncate">{file?.name}</span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 truncate p-1">Upload file</span>
        )}
      </label>

      <input
        id={inputId}
        type="file"
        accept={fileType}
        className="hidden"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      {
        <Button
          className="m-3 w-full"
          disabled={!file}
          onClick={() => {
            if (file) importFunc(file)
            else showErrorToast('import file failed')
          }}
        >
          Confirm
        </Button>
      }
    </div>
  )
}

export default ImportButton
