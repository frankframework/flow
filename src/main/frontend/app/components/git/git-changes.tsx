import { useState } from 'react'
import clsx from 'clsx'
import type { GitStatus, FileHunkState } from '~/types/git.types'
import Checkbox from '~/components/inputs/checkbox'

type GitChangesProps = {
  status: GitStatus | null
  selectedFile: string | null
  fileHunkStates: Record<string, FileHunkState>
  onSelectFile: (file: string) => void
  onToggleFile: (file: string) => void
}

type SectionVariant = 'changes' | 'unversioned' | 'conflicts'

const variantConfig: Record<SectionVariant, { accent: string; badge: string; badgeLabel: string }> = {
  changes: { accent: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-400', badgeLabel: 'M' },
  unversioned: { accent: 'border-l-blue-500', badge: 'bg-blue-500/15 text-blue-400', badgeLabel: 'U' },
  conflicts: { accent: 'border-l-red-500', badge: 'bg-red-500/15 text-red-400', badgeLabel: 'C' },
}

function FileSection({
  title,
  files,
  selectedFile,
  onSelectFile,
  onToggleFile,
  variant,
  fileHunkStates,
}: {
  title: string
  files: string[]
  selectedFile: string | null
  onSelectFile: (file: string) => void
  onToggleFile: (file: string) => void
  variant: SectionVariant
  fileHunkStates: Record<string, FileHunkState>
}) {
  const [collapsed, setCollapsed] = useState(false)
  const config = variantConfig[variant]

  if (files.length === 0) return null

  return (
    <div className={clsx('border-l-2', config.accent)}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="text-foreground hover:bg-hover flex w-full cursor-pointer items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold"
      >
        <span className="w-3 text-[10px]">{collapsed ? '▸' : '▾'}</span>
        <span className="flex-1">{title}</span>
        <span className="bg-foreground-active text-foreground-muted rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
          {files.length}
        </span>
      </button>
      {!collapsed && (
        <div className="pb-1">
          {files.map((file) => {
            const fileName = file.split('/').pop() || file
            const dirPath = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''

            const hunkState = fileHunkStates[file]
            const totalHunks = hunkState?.totalHunks ?? 0
            const selectedCount = hunkState?.selectedHunks.size ?? 0
            const allHunksSelected = totalHunks > 0 && selectedCount === totalHunks
            const someHunksSelected = totalHunks > 0 && selectedCount > 0
            const fileSelectedWithNoHunks = totalHunks === 0 && (hunkState?.selected ?? false)

            const checkboxChecked = allHunksSelected || fileSelectedWithNoHunks
            const checkboxIndeterminate = someHunksSelected && !allHunksSelected

            return (
              <div
                key={file}
                className={clsx(
                  'group mx-2 flex items-center gap-2 rounded px-3 py-1 text-xs hover:cursor-pointer',
                  selectedFile === file ? 'bg-selected' : 'hover:bg-hover',
                )}
                onClick={() => onSelectFile(file)}
              >
                <Checkbox
                  checked={checkboxChecked}
                  indeterminate={checkboxIndeterminate}
                  onChange={() => onToggleFile(file)}
                  title={checkboxChecked ? 'Deselect all chunks' : 'Select all chunks'}
                  onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                />
                <span
                  className={clsx(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold',
                    config.badge,
                  )}
                >
                  {config.badgeLabel}
                </span>
                <span className="text-foreground min-w-0 flex-1 truncate" title={file}>
                  {fileName}
                  {dirPath && <span className="text-foreground-muted ml-1.5 text-[10px]">{dirPath}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GitChanges({
  status,
  selectedFile,
  fileHunkStates,
  onSelectFile,
  onToggleFile,
}: GitChangesProps) {
  if (!status) return null

  const changedFiles = [...new Set([...status.staged, ...status.modified])]

  return (
    <div className="border-b-border overflow-y-auto border-b">
      <FileSection
        title="Changes"
        files={changedFiles}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onToggleFile={onToggleFile}
        variant="changes"
        fileHunkStates={fileHunkStates}
      />
      <FileSection
        title="Unversioned"
        files={status.untracked}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onToggleFile={onToggleFile}
        variant="unversioned"
        fileHunkStates={fileHunkStates}
      />
      {status.conflicting.length > 0 && (
        <FileSection
          title="Conflicts"
          files={status.conflicting}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onToggleFile={onToggleFile}
          variant="conflicts"
          fileHunkStates={fileHunkStates}
        />
      )}
    </div>
  )
}
