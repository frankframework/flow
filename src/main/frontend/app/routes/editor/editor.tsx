import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import clsx from 'clsx'
import XsdFeatures from 'monaco-xsd-code-completion/esm/XsdFeatures'
import 'monaco-xsd-code-completion/src/style.css'
import XsdManager from 'monaco-xsd-code-completion/esm/XsdManager'
import * as monaco from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { validateXML, type XMLValidationError } from 'xmllint-wasm'
import { useShallow } from 'zustand/react/shallow'
import { openInStudio } from '~/actions/navigationActions'
import EditorFileStructure from '~/components/file-structure/editor-file-structure'
import DiffTabView from '~/components/git/diff-tab-view'
import GitPanel from '~/components/git/git-panel'
import Button from '~/components/inputs/button'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import EditorTabs from '~/components/tabs/editor-tabs'
import { showErrorToastFrom } from '~/components/toast'
import { useTheme } from '~/hooks/use-theme'
import { fetchConfiguration, saveConfiguration } from '~/services/configuration-service'
import { fetchFile, updateFile } from '~/services/file-service'
import { refreshOpenDiffs } from '~/services/git-service'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import useEditorTabStore from '~/stores/editor-tab-store'
import { useProjectStore } from '~/stores/project-store'
import { useSettingsStore } from '~/stores/settings-store'
import { toProjectRelativePath } from '~/utils/path-utils'
import flowXsd from '../../../src/assets/xsd/FlowConfig.xsd?raw'
import {
  extractFlowElements,
  findAdapterIndexAtOffset,
  findAdaptersInXml,
  findFlowElementsStartLine,
  lineToOffset,
  normalizeFrankElements,
  wrapFlowXml,
} from './xml-utils'

type LeftTab = 'files' | 'git'
type SaveStatus = 'idle' | 'saving' | 'saved'
export interface ValidationError {
  message: string
  lineNumber: number
  startColumn: number
  endColumn: number
}

export interface TextModel {
  getLineContent: (n: number) => string
  getLineCount: () => number
  getLineMaxColumn: (n: number) => number
}

interface CachedFile {
  content: string
  type: string
}

const SAVED_DISPLAY_DURATION = 2000
const ELEMENT_ERROR_RE = /[Ee]lement [\u2018\u2019'"'{]?([\w:.-]+)[\u2018\u2019'"'}]?/
const ATTRIBUTE_ERROR_RE = /[Aa]ttribute [\u2018\u2019'"'{]?([\w:.-]+)[\u2018\u2019'"'}]?/

function extractLocalName(name: string): string {
  return name.includes(':') ? name.split(':').pop()! : name
}

function findElementRange(lineContent: string, localName: string): { startColumn: number; endColumn: number } | null {
  const openIdx = lineContent.indexOf(`<${localName}`)
  if (openIdx !== -1) return { startColumn: openIdx + 1, endColumn: openIdx + 1 + localName.length + 1 }
  const closeIdx = lineContent.indexOf(`</${localName}`)
  if (closeIdx !== -1) return { startColumn: closeIdx + 1, endColumn: closeIdx + 2 + localName.length + 1 }
  return null
}

function findAttributeRange(lineContent: string, localName: string): { startColumn: number; endColumn: number } | null {
  const idx = lineContent.search(new RegExp(String.raw`\b${localName}\s*=`))
  if (idx < 0) return null
  return { startColumn: idx + 1, endColumn: idx + localName.length + 1 }
}

function fallbackRange(lineContent: string): { startColumn: number; endColumn: number } {
  const firstNonWs = lineContent.search(/\S/)
  return { startColumn: firstNonWs >= 0 ? firstNonWs + 1 : 1, endColumn: lineContent.length + 1 }
}

function findErrorRange(lineContent: string, message: string): { startColumn: number; endColumn: number } {
  const elementMatch = message.match(ELEMENT_ERROR_RE)
  if (elementMatch) {
    const range = findElementRange(lineContent, extractLocalName(elementMatch[1]))
    if (range) return range
  }

  const attrMatch = message.match(ATTRIBUTE_ERROR_RE)
  if (attrMatch) {
    const range = findAttributeRange(lineContent, extractLocalName(attrMatch[1]))
    if (range) return range
  }

  return fallbackRange(lineContent)
}

function notWellFormedError(model: TextModel): ValidationError {
  return { message: 'XML is not well-formed', lineNumber: 1, startColumn: 1, endColumn: model.getLineMaxColumn(1) }
}

function mapToValidationErrors(rawErrors: readonly XMLValidationError[], model: TextModel): ValidationError[] {
  const totalLines = model.getLineCount()
  const seen = new Set<number>()

  return rawErrors
    .map((e) => {
      const lineNumber = Math.max(1, Math.min(e.loc?.lineNumber ?? 1, totalLines))
      const { startColumn, endColumn } = findErrorRange(model.getLineContent(lineNumber), e.message)
      return { message: e.message, lineNumber, startColumn, endColumn }
    })
    .filter((e) => {
      if (seen.has(e.lineNumber)) return false
      seen.add(e.lineNumber)
      return true
    })
}

function toDecoration(e: ValidationError) {
  return {
    range: {
      startLineNumber: e.lineNumber,
      startColumn: e.startColumn,
      endLineNumber: e.lineNumber,
      endColumn: e.endColumn,
    },
    options: {
      inlineClassName: 'xml-lint xml-lint--fatal-error',
      hoverMessage: { value: `**XSD:** ${e.message}` },
      overviewRuler: { color: '#ff2424', position: 4 },
    },
  }
}

function toMarker(e: ValidationError, severity: number) {
  return {
    startLineNumber: e.lineNumber,
    startColumn: e.startColumn,
    endLineNumber: e.lineNumber,
    endColumn: e.endColumn,
    message: e.message,
    severity,
  }
}

function toMonacoType(type: string | null) {
  if (!type || type === 'text/plain') return 'plaintext'
  return type.split('/').pop() ?? ''
}

function isConfigurationFile(fileExtension: string) {
  return fileExtension === 'xml'
}

async function validateFlow(content: string, model: monaco.editor.ITextModel): Promise<ValidationError[]> {
  const flowFragment = extractFlowElements(content)
  if (!flowFragment) return []

  const wrapped = wrapFlowXml(flowFragment)
  const startLine = findFlowElementsStartLine(content)

  const flowResult = await validateXML({
    xml: [{ fileName: 'flow.xml', contents: wrapped }],
    schema: [{ fileName: 'flowconfig.xsd', contents: flowXsd }],
  })

  return mapToValidationErrors(flowResult.errors, model).map((err) => ({
    ...err,
    lineNumber: err.lineNumber + startLine,
    startColumn: 1,
    endColumn: model.getLineLength(err.lineNumber + startLine),
  }))
}

async function validateFrank(
  content: string,
  xsd: string,
  model: monaco.editor.ITextModel,
): Promise<ValidationError[]> {
  const result = await validateXML({
    xml: [{ fileName: 'config.xml', contents: content }],
    schema: [{ fileName: 'FrankConfig.xsd', contents: xsd }],
  })

  if (!result.valid && result.errors.length === 0) {
    return [notWellFormedError(model)]
  }

  const filtered = result.errors.filter(
    (e) => !e.message.includes('{urn:frank-flow}') && !e.message.includes('Skipping attribute use prohibition'),
  )

  return mapToValidationErrors(filtered, model)
}

/**
 * Maps a single Monaco regex match to decoration objects.
 */
function mapMatchToDecorations(match: monaco.editor.FindMatch): monaco.editor.IModelDeltaDecoration[] {
  const keyText = match.matches![1]
  const valueText = match.matches![3]

  return [
    {
      range: {
        startLineNumber: match.range.startLineNumber,
        startColumn: match.range.startColumn,
        endLineNumber: match.range.startLineNumber,
        endColumn: match.range.startColumn + keyText.length,
      },
      options: { inlineClassName: 'monaco-flow-attribute' },
    },
    {
      range: {
        startLineNumber: match.range.startLineNumber,
        startColumn: match.range.endColumn - valueText.length,
        endLineNumber: match.range.startLineNumber,
        endColumn: match.range.endColumn,
      },
      options: { inlineClassName: 'monaco-flow-attribute-value' },
    },
  ]
}

export default function CodeEditor() {
  const theme = useTheme()
  const project = useProjectStore.getState().project
  const [activeTabFilePath, setActiveTabFilePath] = useState<string>(useEditorTabStore.getState().activeTabFilePath)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileLanguage, setFileLanguage] = useState<string>('xml')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [leftTab, setLeftTab] = useState<LeftTab>('files')
  const [editorMounted, setEditorMounted] = useState(false)
  const [xsdLoaded, setXsdLoaded] = useState(false)
  const editorReference = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoReference = useRef<Monaco | null>(null)
  const xsdContentRef = useRef<string | null>(null)
  const errorDecorationsRef = useRef<{ clear: () => void } | null>(null)
  const flowDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationCounterRef = useRef(0)
  const contentCacheRef = useRef<Map<string, CachedFile>>(new Map())

  const activeTab = useEditorTabStore(
    useShallow((state) => {
      const tab = state.activeTabFilePath ? state.tabs[state.activeTabFilePath] : undefined
      return {
        configurationPath: tab?.configurationPath,
        type: tab?.type ?? 'editor',
        diffData: tab?.diffData,
      }
    }),
  )

  const refreshCounter = useEditorTabStore((state) => state.refreshCounter)
  const lastRefreshCounterRef = useRef(refreshCounter)

  const isDiffTab = activeTab.type === 'diff'

  const applyFlowHighlighter = useCallback(() => {
    const editor = editorReference.current
    const model = editor?.getModel()

    if (!editor || !model || fileLanguage !== 'xml') return

    const matches = model.findMatches(
      String.raw`\b(xmlns:flow|flow:[\w-]+)(\s*=\s*)("[^"]*"|'[^']*')`,
      false,
      true,
      false,
      null,
      true,
    )

    const decorations = matches.flatMap((match) => mapMatchToDecorations(match))

    if (flowDecorationsRef.current) {
      flowDecorationsRef.current.set(decorations)
    } else {
      flowDecorationsRef.current = editor.createDecorationsCollection(decorations)
    }
  }, [fileLanguage])

  const performSave = useCallback(
    (content?: string) => {
      if (!project || !activeTabFilePath || isDiffTab) return

      const updatedContent = content ?? editorReference.current?.getValue?.()
      if (!updatedContent) return

      const activeTab = useEditorTabStore.getState().getTab(activeTabFilePath)
      const fileExtension = activeTab?.name.split('.').pop()?.toLowerCase()
      const configPath = activeTab?.configurationPath
      if (!configPath) return

      function finishSaving() {
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_DURATION)
      }

      setSaveStatus('saving')
      if (isConfigurationFile(fileExtension ?? '')) {
        saveConfiguration(project.name, configPath, updatedContent)
          .then(({ xmlContent }) => {
            setFileContent(xmlContent)
            contentCacheRef.current.set(activeTabFilePath, { type: 'xml', content: xmlContent })
            finishSaving()
            if (project.isGitRepository) refreshOpenDiffs(project.name)
          })
          .catch((error) => {
            showErrorToastFrom('Error saving', error)
            setSaveStatus('idle')
          })
      } else {
        updateFile(project.name, configPath, updatedContent)
          .then(() => finishSaving())
          .catch((error) => {
            showErrorToastFrom('Error saving', error)
            setSaveStatus('idle')
          })
      }
    },
    [project, activeTabFilePath, isDiffTab],
  )

  const flushPendingSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      performSave()
    }
  }, [performSave])

  const autosaveEnabled = useSettingsStore((s) => s.general.autoSave.enabled)
  const autosaveDelay = useSettingsStore((s) => s.general.autoSave.delayMs)

  const scheduleSave = useCallback(() => {
    if (!autosaveEnabled) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      performSave()
    }, autosaveDelay)
  }, [performSave, autosaveEnabled, autosaveDelay])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current)
    }
  }, [])

  const applyValidationDecorations = useCallback((errors: ValidationError[]) => {
    const monaco = monacoReference.current
    const editor = editorReference.current
    if (!monaco || !editor) return

    const model = editor.getModel()
    if (!model) return

    if (errorDecorationsRef.current) {
      errorDecorationsRef.current.clear()
      errorDecorationsRef.current = null
    }

    if (errors.length > 0) {
      errorDecorationsRef.current = editor.createDecorationsCollection(errors.map((element) => toDecoration(element)))
    }

    monaco.editor.setModelMarkers(
      model,
      'xsd-validation',
      errors.map((e) => toMarker(e, monaco.MarkerSeverity.Error)),
    )
  }, [])

  const runSchemaValidation = useCallback(
    async (content: string) => {
      const editor = editorReference.current
      const xsdContent = xsdContentRef.current
      if (!editor || !xsdContent) return

      const validationId = ++validationCounterRef.current
      const model = editor.getModel() as monaco.editor.ITextModel
      if (!model) return

      try {
        const [flowErrors, frankErrors] = await Promise.all([
          validateFlow(content, model),
          validateFrank(content, xsdContent, model),
        ])

        if (validationId !== validationCounterRef.current) return

        applyValidationDecorations([...frankErrors, ...flowErrors])
      } catch {
        if (validationId === validationCounterRef.current) {
          applyValidationDecorations([notWellFormedError(model)])
        }
      }
    },
    [applyValidationDecorations],
  )

  const scheduleSchemaValidation = useCallback(
    (content: string) => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current)
      validationTimerRef.current = setTimeout(() => {
        validationTimerRef.current = null
        runSchemaValidation(content)
      }, 800)
    },
    [runSchemaValidation],
  )

  useEffect(() => {
    if (!editorMounted || !editorReference.current || !monacoReference.current) return

    const xsdManager = new XsdManager(editorReference.current)
    const xsdFeatures = new XsdFeatures(xsdManager, monacoReference.current, editorReference.current)

    xsdFeatures.addCompletion()
    xsdFeatures.addGenerateAction()
    xsdFeatures.addReformatAction()

    fetchFrankConfigXsd()
      .then((xsdContent) => {
        xsdContentRef.current = xsdContent
        xsdManager.set({ path: 'FrankConfig.xsd', value: xsdContent, namespace: 'xs', alwaysInclude: true })
        xsdManager.set({ path: 'FlowConfig.xsd', value: flowXsd, namespace: 'xs', alwaysInclude: true })
        setXsdLoaded(true)
      })
      .catch(console.error)
  }, [editorMounted])

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorReference.current = editor
    monacoReference.current = monacoInstance
    setEditorMounted(true)

    applyFlowHighlighter()

    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
      run: () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
        performSave()
      },
    })

    editor.addAction({
      id: 'normalize-frank-elements',
      label: 'Normalize Frank Elements',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2,
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF],
      run: async () => {
        if (activeTabFilePath.endsWith('.xml')) {
          const current = editor.getValue()
          const updated = await normalizeFrankElements(current)
          editor.pushUndoStop()
          editor.executeEdits('normalize-frank', [{ range: editor.getModel()!.getFullModelRange(), text: updated }])
          editor.pushUndoStop()
        }
      },
    })
  }

  useEffect(() => {
    return useEditorTabStore.subscribe(
      (state) => state.activeTabFilePath,
      (newActiveTab, oldActiveTab) => {
        if (oldActiveTab && oldActiveTab !== newActiveTab) {
          const currentEditor = editorReference.current
          if (currentEditor) {
            const content = currentEditor.getValue()
            const type = currentEditor.getModel()?.getLanguageId() || 'xml'
            contentCacheRef.current.set(oldActiveTab, { type, content })
          }
          flushPendingSave()
        }
        setActiveTabFilePath(newActiveTab)
      },
    )
  }, [flushPendingSave])

  useEffect(() => {
    if (isDiffTab) return

    function setMonacoContent(content: string, type: string, abortSignal?: AbortSignal) {
      if (!abortSignal || !abortSignal.aborted) {
        contentCacheRef.current.set(activeTabFilePath, { type, content })
        setFileContent(content)
        setFileLanguage(type)
      }
    }

    const abortController = new AbortController()
    const activeTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    if (!activeTab || !project) return

    const filePath = activeTab?.configurationPath
    const fileExtension = activeTab.name.split('.').pop()?.toLowerCase()
    const isForceRefresh = refreshCounter !== lastRefreshCounterRef.current
    lastRefreshCounterRef.current = refreshCounter

    if (!isForceRefresh) {
      const cached = contentCacheRef.current.get(activeTabFilePath)
      if (cached !== undefined) {
        setFileContent(cached.content)
        setFileLanguage(cached.type)
        return
      }
    }

    if (isConfigurationFile(fileExtension ?? '')) {
      fetchConfiguration(project.name, filePath, abortController.signal)
        .then((content) => setMonacoContent(content, 'xml', abortController.signal))
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error('Failed to load configuration XML:', error)
          }
        })
    } else {
      fetchFile(project.name, filePath, abortController.signal)
        .then(({ content, type }) => {
          const fileType = toMonacoType(type)
          setMonacoContent(content, fileType, abortController.signal)
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            setMonacoContent('', 'plaintext', abortController.signal)
            console.error('Failed to load file:', error)
          }
        })
    }
    return () => abortController.abort()
  }, [project, activeTabFilePath, isDiffTab, refreshCounter])

  useEffect(() => {
    if (errorDecorationsRef.current) {
      errorDecorationsRef.current.clear()
      errorDecorationsRef.current = null
    }
    // Also clear flow decorations when switching files
    if (flowDecorationsRef.current) {
      flowDecorationsRef.current.set([])
    }
    const monaco = monacoReference.current
    const editor = editorReference.current
    if (monaco && editor) {
      const model = editor.getModel()
      if (model) monaco.editor.setModelMarkers(model, 'xsd-validation', [])
    }
  }, [activeTabFilePath])

  useEffect(() => {
    if (!fileContent || !xsdLoaded || isDiffTab || fileLanguage !== 'xml') return
    runSchemaValidation(fileContent)
    applyFlowHighlighter() // Refresh highlighter when schema is loaded or content changes
  }, [fileContent, xsdLoaded, isDiffTab, runSchemaValidation, fileLanguage, applyFlowHighlighter])

  useEffect(() => {
    if (!fileContent || !activeTabFilePath || !editorReference.current || isDiffTab) return

    const editor = editorReference.current
    const model = editor.getModel()
    if (!model) return

    const lines = fileContent.split('\n')
    const matchIndex = lines.findIndex((line) => line.includes('<Adapter') && line.includes(activeTabFilePath))
    if (matchIndex === -1) return

    const lineNumber = matchIndex + 1
    editor.revealLineNearTop(lineNumber)
    editor.setPosition({ lineNumber, column: 1 })
    editor.focus()

    const decorations = editor.createDecorationsCollection([
      {
        range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
        options: { isWholeLine: true, className: 'highlight-line' },
      },
    ])

    const timeout = setTimeout(() => decorations.clear(), 2000)
    return () => clearTimeout(timeout)
  }, [fileContent, activeTabFilePath, isDiffTab])

  const handleOpenInStudio = useCallback(() => {
    const editorTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    if (!editorTab) return

    const xml = editorReference.current?.getValue() || fileContent
    if (!xml) return

    const adapters = findAdaptersInXml(xml)
    if (adapters.length === 0) return

    const cursorLine = editorReference.current?.getPosition()?.lineNumber
    const adapterPosition =
      adapters.length === 1 || !cursorLine ? 0 : findAdapterIndexAtOffset(adapters, lineToOffset(xml, cursorLine))

    openInStudio(adapters[adapterPosition].name, editorTab.configurationPath, adapterPosition)
  }, [activeTabFilePath, fileContent])

  const isGitRepo = !!project?.isGitRepository

  return (
    <SidebarLayout name="editor">
      <>
        <div className="flex h-12 items-center justify-between pr-4">
          <SidebarHeader side={SidebarSide.LEFT} title="Files" />
          <div className="border-border ml-auto flex overflow-hidden rounded border text-sm">
            <button
              onClick={() => setLeftTab('files')}
              className={clsx(
                'cursor-pointer px-3 py-1 transition-colors',
                leftTab === 'files'
                  ? 'bg-selected text-foreground font-medium'
                  : 'hover:bg-foreground-active text-muted-foreground',
              )}
            >
              Files
            </button>
            {isGitRepo && (
              <button
                onClick={() => setLeftTab('git')}
                className={clsx(
                  'border-border cursor-pointer border-l px-3 py-1 transition-colors',
                  leftTab === 'git'
                    ? 'bg-selected text-foreground font-medium'
                    : 'hover:bg-foreground-active text-muted-foreground',
                )}
              >
                Git
              </button>
            )}
          </div>
        </div>
        {leftTab === 'files' && <EditorFileStructure />}
        {leftTab !== 'files' && isGitRepo && (
          <GitPanel projectName={project!.name} hasStoredToken={project!.hasStoredToken} />
        )}
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <EditorTabs />
          </div>
        </div>
        {activeTabFilePath ? (
          isDiffTab && activeTab.diffData ? (
            <DiffTabView diffData={activeTab.diffData} />
          ) : (
            <>
              <div className="border-b-border bg-background flex h-12 items-center justify-between border-b p-4">
                <span>
                  Path:{' '}
                  {activeTab.configurationPath && project
                    ? toProjectRelativePath(activeTab.configurationPath, project)
                    : activeTab.configurationPath}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'text-muted-foreground text-xs transition-opacity duration-300',
                      saveStatus === 'idle' ? 'opacity-0' : 'opacity-100',
                    )}
                  >
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'saved' && 'Saved'}
                  </span>
                  <Button onClick={handleOpenInStudio} className="flex items-center gap-1.5" title="Open in Studio">
                    <RulerCrossPenIcon className="h-4 w-4 fill-current" />
                    Open in Studio
                  </Button>
                </div>
              </div>
              <div className="h-full">
                <Editor
                  language={fileLanguage}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  value={fileContent}
                  onMount={handleEditorMount}
                  onChange={(value) => {
                    scheduleSave()
                    if (value && fileLanguage === 'xml') {
                      scheduleSchemaValidation(value)
                      applyFlowHighlighter() // Real-time highlight updates
                    }
                  }}
                  options={{ automaticLayout: true, quickSuggestions: false }}
                />
              </div>
            </>
          )
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="border-border bg-background/40 max-w-md rounded-2xl border border-dashed p-10 shadow-inner backdrop-blur-sm">
              <h2 className="mb-2 text-xl font-semibold">No file selected</h2>
              <p className="text-sm">Select an adapter from the file structure on the left to start editing.</p>
            </div>
          </div>
        )}
      </>
    </SidebarLayout>
  )
}
