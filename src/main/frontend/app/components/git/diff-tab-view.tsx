import '~/utils/monaco-setup'
import * as monaco from 'monaco-editor'
import { useShallow } from 'zustand/react/shallow'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '~/hooks/use-theme'
import { useGitStore } from '~/stores/git-store'
import type { DiffTabData } from '~/stores/editor-tab-store'
import type { GitHunk } from '~/types/git.types'
import Checkbox from '~/components/inputs/checkbox'

type CodeEditor = monaco.editor.IStandaloneCodeEditor

function getLanguage(filePath: string): string {
  if (filePath.endsWith('.xml')) return 'xml'
  if (filePath.endsWith('.json')) return 'json'
  return 'plaintext'
}

function applyHunkDecorations(
  modifiedEditor: CodeEditor,
  hunks: GitHunk[],
  selectedHunks: Set<number>,
  previousDecorations: string[],
): string[] {
  const decorations: Parameters<CodeEditor['deltaDecorations']>[1] = []

  for (const hunk of hunks) {
    if (hunk.newCount <= 0) continue
    const isSelected = selectedHunks.has(hunk.index)
    const startLine = hunk.newStart
    const endLine = hunk.newStart + hunk.newCount - 1

    // Visible checkbox on the first line of the hunk
    decorations.push({
      range: new monaco.Range(startLine, 1, startLine, 1),
      options: {
        glyphMarginClassName: isSelected ? 'hunk-glyph-checked' : 'hunk-glyph-unchecked',
        glyphMarginHoverMessage: { value: isSelected ? 'Deselect chunk' : 'Select chunk' },
      },
    })

    for (let line = startLine + 1; line <= endLine; line++) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          glyphMarginClassName: 'hunk-glyph-hit-area',
        },
      })
    }

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

  return modifiedEditor.deltaDecorations(previousDecorations, decorations)
}

type DiffTabViewProperties = {
  diffData: DiffTabData
}

export default function DiffTabView({ diffData }: DiffTabViewProperties): JSX.Element {
  const theme = useTheme()
  const { fileHunkStates, toggleFileHunk } = useGitStore(
    useShallow(
      (
        s,
      ): { fileHunkStates: Record<string, FileHunkState>; toggleFileHunk: (file: string, index: number) => void } => ({
        fileHunkStates: s.fileHunkStates,
        toggleFileHunk: s.toggleFileHunk,
      }),
    ),
  )

  const filePath = diffData.filePath
  const hunks = diffData.hunks
  const language = getLanguage(filePath)
  const hunkState = fileHunkStates[filePath]
  const selectedHunks = useMemo(
    (): Set<number> => hunkState?.selectedHunks ?? new Set<number>(),
    [hunkState?.selectedHunks],
  )

  const containerReference = useRef<HTMLDivElement>(null)
  const diffEditorReference = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const decorationsReference = useRef<string[]>([])
  const [editorReady, setEditorReady] = useState(false)

  const hunksReference = useRef(hunks)
  hunksReference.current = hunks
  const toggleReference = useRef(toggleFileHunk)
  toggleReference.current = toggleFileHunk
  const filePathReference = useRef(filePath)
  filePathReference.current = filePath

  useEffect((): void => {
    if (!editorReady || !diffEditorReference.current) return
    const modifiedEditor = diffEditorReference.current.getModifiedEditor()
    decorationsReference.current = applyHunkDecorations(
      modifiedEditor,
      hunks,
      selectedHunks,
      decorationsReference.current,
    )
  }, [hunks, selectedHunks, editorReady])

  useEffect((): (() => void) | undefined => {
    if (!containerReference.current) return

    const diffEditor = monaco.editor.createDiffEditor(containerReference.current, {
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      glyphMargin: true,
    })

    diffEditorReference.current = diffEditor

    const modifiedEditor = diffEditor.getModifiedEditor()
    modifiedEditor.updateOptions({ glyphMargin: true })

    decorationsReference.current = applyHunkDecorations(
      modifiedEditor,
      hunksReference.current,
      useGitStore.getState().fileHunkStates[filePathReference.current]?.selectedHunks ?? new Set(),
      decorationsReference.current,
    )

    modifiedEditor.onMouseDown((event): void => {
      const targetType = event.target.type
      if (targetType === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = event.target.position?.lineNumber
        if (lineNumber == null) return

        for (const hunk of hunksReference.current) {
          if (hunk.newCount <= 0) continue
          if (lineNumber >= hunk.newStart && lineNumber < hunk.newStart + hunk.newCount) {
            toggleReference.current(filePathReference.current, hunk.index)
            return
          }
        }
      }
    })

    setEditorReady(true)

    return (): void => {
      diffEditor.dispose()
      diffEditorReference.current = null
      decorationsReference.current = []
      setEditorReady(false)
    }
  }, [])

  useEffect((): (() => void) | undefined => {
    const diffEditor = diffEditorReference.current
    if (!diffEditor || !editorReady) return

    const originalModel = monaco.editor.createModel(diffData.oldContent, language)
    const modifiedModel = monaco.editor.createModel(diffData.newContent, language)
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    return (): void => {
      originalModel.dispose()
      modifiedModel.dispose()
    }
  }, [diffData, language, editorReady])

  useEffect((): void => {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
  }, [theme])

  const selectableHunks = hunks.filter((hunk): boolean => hunk.newCount > 0)
  const allSelected =
    selectableHunks.length > 0 && selectableHunks.every((hunk): boolean => selectedHunks.has(hunk.index))
  const someSelected = selectableHunks.some((hunk): boolean => selectedHunks.has(hunk.index))

  const handleToggleAllHunks = (): void => {
    for (const hunk of selectableHunks) {
      const isSelected = selectedHunks.has(hunk.index)
      if (allSelected ? isSelected : !isSelected) {
        toggleFileHunk(filePath, hunk.index)
      }
    }
  }

  return (
    <>
      <div className="border-b-border bg-background flex h-12 items-center gap-3 border-b px-4">
        <Checkbox
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          onChange={handleToggleAllHunks}
          title={allSelected ? 'Deselect all chunks' : 'Select all chunks'}
        />
        <span className="text-sm font-medium">{filePath}</span>
      </div>
      <div className="min-h-0 flex-1">
        <div ref={containerReference} className="h-full w-full" />
      </div>
    </>
  )
}
