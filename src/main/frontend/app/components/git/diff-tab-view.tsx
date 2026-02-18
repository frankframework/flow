import { DiffEditor, type Monaco, type DiffOnMount, type MonacoDiffEditor } from '@monaco-editor/react'
import { useShallow } from 'zustand/react/shallow'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '~/hooks/use-theme'
import { useGitStore } from '~/stores/git-store'
import type { DiffTabData } from '~/stores/editor-tab-store'
import type { GitHunk } from '~/types/git.types'
import type { editor } from 'monaco-editor'

function getLanguage(filePath: string): string {
  if (filePath.endsWith('.xml')) return 'xml'
  if (filePath.endsWith('.json')) return 'json'
  return 'plaintext'
}

function applyHunkDecorations(
  modifiedEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  hunks: GitHunk[],
  selectedHunks: Set<number>,
  prevDecorations: string[],
): string[] {
  const decorations: editor.IModelDeltaDecoration[] = []

  for (const hunk of hunks) {
    if (hunk.newCount <= 0) continue
    const isSelected = selectedHunks.has(hunk.index)
    const startLine = hunk.newStart
    const endLine = hunk.newStart + hunk.newCount - 1

    decorations.push({
      range: new monaco.Range(startLine, 1, startLine, 1),
      options: {
        glyphMarginClassName: isSelected ? 'hunk-glyph-checked' : 'hunk-glyph-unchecked',
        glyphMarginHoverMessage: { value: isSelected ? 'Deselect chunk' : 'Select chunk' },
      },
    })

    if (isSelected) {
      decorations.push({
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'hunk-line-selected',
        },
      })
    }
  }

  return modifiedEditor.deltaDecorations(prevDecorations, decorations)
}

interface DiffTabViewProps {
  diffData: DiffTabData
  onStageSelected: () => void
}

export default function DiffTabView({ diffData, onStageSelected }: DiffTabViewProps) {
  const theme = useTheme()
  const { fileHunkStates, toggleFileHunk } = useGitStore(
    useShallow((s) => ({
      fileHunkStates: s.fileHunkStates,
      toggleFileHunk: s.toggleFileHunk,
    })),
  )

  const filePath = diffData.filePath
  const hunks = diffData.hunks
  const hunkState = fileHunkStates[filePath]
  const selectedHunks = useMemo(() => hunkState?.selectedHunks ?? new Set<number>(), [hunkState?.selectedHunks])

  const diffEditorRef = useRef<MonacoDiffEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const [editorReady, setEditorReady] = useState(false)

  const hunksRef = useRef(hunks)
  hunksRef.current = hunks
  const toggleRef = useRef(toggleFileHunk)
  toggleRef.current = toggleFileHunk
  const filePathRef = useRef(filePath)
  filePathRef.current = filePath

  useEffect(() => {
    if (!editorReady || !diffEditorRef.current || !monacoRef.current) return
    const modifiedEditor = diffEditorRef.current.getModifiedEditor()
    decorationsRef.current = applyHunkDecorations(
      modifiedEditor,
      monacoRef.current,
      hunks,
      selectedHunks,
      decorationsRef.current,
    )
  }, [hunks, selectedHunks, editorReady])

  const handleDiffMount: DiffOnMount = useCallback((diffEditor: MonacoDiffEditor, monaco: Monaco) => {
    diffEditorRef.current = diffEditor
    monacoRef.current = monaco

    const modifiedEditor = diffEditor.getModifiedEditor()
    modifiedEditor.updateOptions({ glyphMargin: true })

    decorationsRef.current = applyHunkDecorations(
      modifiedEditor,
      monaco,
      hunksRef.current,
      useGitStore.getState().fileHunkStates[filePathRef.current]?.selectedHunks ?? new Set(),
      decorationsRef.current,
    )

    modifiedEditor.onMouseDown((e: editor.IEditorMouseEvent) => {
      const targetType = e.target.type
      if (targetType === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber == null) return

        for (const hunk of hunksRef.current) {
          if (hunk.newCount <= 0) continue
          if (lineNumber >= hunk.newStart && lineNumber < hunk.newStart + hunk.newCount) {
            toggleRef.current(filePathRef.current, hunk.index)
            return
          }
        }
      }
    })

    setEditorReady(true)
  }, [])

  const language = getLanguage(filePath)

  return (
    <>
      <div className="border-b-border bg-background flex h-12 items-center justify-between border-b px-4">
        <span className="text-sm font-medium">{filePath}</span>
        {hunks.length > 0 && (
          <button
            onClick={onStageSelected}
            disabled={selectedHunks.size === 0}
            className="border-border bg-background hover:bg-foreground-active rounded border px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            Stage Selected ({selectedHunks.size}/{hunks.length})
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DiffEditor
          original={diffData.oldContent}
          modified={diffData.newContent}
          language={language}
          theme={`vs-${theme}`}
          onMount={handleDiffMount}
          options={{
            readOnly: true,
            automaticLayout: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            glyphMargin: true,
          }}
        />
      </div>
    </>
  )
}
