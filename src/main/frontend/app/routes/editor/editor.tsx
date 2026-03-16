import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import XsdManager from 'monaco-xsd-code-completion/esm/XsdManager'
import XsdFeatures from 'monaco-xsd-code-completion/esm/XsdFeatures'
import 'monaco-xsd-code-completion/src/style.css'
import { validateXML, type XMLValidationError } from 'xmllint-wasm'
import { useShallow } from 'zustand/react/shallow'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarClose from '~/components/sidebars-layout/sidebar-close'
import { useTheme } from '~/hooks/use-theme'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore } from '~/stores/project-store'
import EditorFileStructure from '~/components/file-structure/editor-file-structure'
import useEditorTabStore from '~/stores/editor-tab-store'
import EditorTabs from '~/components/tabs/editor-tabs'
import { fetchConfiguration, saveConfiguration } from '~/services/configuration-service'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import { openInStudio } from '~/actions/navigationActions'
import Button from '~/components/inputs/button'
import { showErrorToastFrom } from '~/components/toast'
import GitPanel from '~/components/git/git-panel'
import DiffTabView from '~/components/git/diff-tab-view'
import clsx from 'clsx'
import { refreshOpenDiffs } from '~/services/git-service'
import { findAdapterIndexAtOffset, findAdaptersInXml, lineToOffset, normalizeFrankElements } from './xml-utils'
import { useSettingsStore } from '~/stores/settings-store'
import { toProjectRelativePath } from '~/utils/path-utils'

type LeftTab = 'files' | 'git'
type SaveStatus = 'idle' | 'saving' | 'saved'
interface ValidationError {
  message: string
  lineNumber: number
  startColumn: number
  endColumn: number
}
interface TextModel {
  getLineContent: (n: number) => string
  getLineCount: () => number
  getLineMaxColumn: (n: number) => number
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

export default function CodeEditor() {
  const theme = useTheme()
  const project = useProjectStore.getState().project
  const [activeTabFilePath, setActiveTabFilePath] = useState<string>(useEditorTabStore.getState().activeTabFilePath)
  const [xmlContent, setXmlContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [leftTab, setLeftTab] = useState<LeftTab>('files')
  const [editorMounted, setEditorMounted] = useState(false)
  const [xsdLoaded, setXsdLoaded] = useState(false)
  const editorReference = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoReference = useRef<Monaco | null>(null)
  const xsdContentRef = useRef<string | null>(null)
  const errorDecorationsRef = useRef<{ clear: () => void } | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationCounterRef = useRef(0)
  const contentCacheRef = useRef<Map<string, string>>(new Map())

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

  const performSave = useCallback(
    async (content?: string) => {
      if (!project || !activeTabFilePath || isDiffTab) return

      const updatedContent = content ?? editorReference.current?.getValue?.()
      if (!updatedContent) return

      const configPath = useEditorTabStore.getState().getTab(activeTabFilePath)?.configurationPath
      if (!configPath) return

      setSaveStatus('saving')
      try {
        const xmlResponse = await saveConfiguration(project.name, configPath, updatedContent)
        setXmlContent(xmlResponse.xmlContent)
        contentCacheRef.current.set(activeTabFilePath, updatedContent)
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_DURATION)
        refreshOpenDiffs(project.name)
      } catch (error) {
        showErrorToastFrom('Error saving', error)
        setSaveStatus('idle')
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
      const monaco = monacoReference.current
      const editor = editorReference.current
      const xsdContent = xsdContentRef.current
      if (!monaco || !editor || !xsdContent) return

      const validationId = ++validationCounterRef.current

      try {
        const result = await validateXML({
          xml: [{ fileName: 'config.xml', contents: content }],
          schema: [{ fileName: 'FrankConfig.xsd', contents: xsdContent }],
        })

        if (validationId !== validationCounterRef.current) return

        const model = editor.getModel()
        if (!model) return

        if (!result.valid && result.errors.length === 0) {
          applyValidationDecorations([notWellFormedError(model)])
          return
        }

        applyValidationDecorations(mapToValidationErrors(result.errors, model))
      } catch {
        if (validationId !== validationCounterRef.current) return
        const model = editor.getModel()
        if (!model) return
        applyValidationDecorations([notWellFormedError(model)])
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
        setXsdLoaded(true)
      })
      .catch(console.error)
  }, [editorMounted])

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorReference.current = editor
    monacoReference.current = monacoInstance
    setEditorMounted(true)

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
        if (oldActiveTab && oldActiveTab !== newActiveTab) flushPendingSave()
        if (oldActiveTab && oldActiveTab !== newActiveTab) {
          const currentContent = editorReference.current?.getValue()
          if (currentContent !== undefined) {
            contentCacheRef.current.set(oldActiveTab, currentContent)
          }
          flushPendingSave()
        }
        setActiveTabFilePath(newActiveTab)
      },
    )
  }, [flushPendingSave])

  useEffect(() => {
    if (isDiffTab) return

    const abortController = new AbortController()

    async function fetchXml() {
      try {
        const configPath = useEditorTabStore.getState().getTab(activeTabFilePath)?.configurationPath
        if (!configPath || !project) return

        const isForceRefresh = refreshCounter !== lastRefreshCounterRef.current
        lastRefreshCounterRef.current = refreshCounter

        if (!isForceRefresh) {
          const cached = contentCacheRef.current.get(activeTabFilePath)
          if (cached !== undefined) {
            setXmlContent(cached)
            return
          }
        }

        const xmlString = await fetchConfiguration(project.name, configPath, abortController.signal)
        if (!abortController.signal.aborted) {
          contentCacheRef.current.set(activeTabFilePath, xmlString)
          setXmlContent(xmlString)
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Failed to load XML:', error)
        }
      }
    }

    fetchXml()
    return () => abortController.abort()
  }, [project, activeTabFilePath, isDiffTab, refreshCounter])

  useEffect(() => {
    if (errorDecorationsRef.current) {
      errorDecorationsRef.current.clear()
      errorDecorationsRef.current = null
    }
    const monaco = monacoReference.current
    const editor = editorReference.current
    if (monaco && editor) {
      const model = editor.getModel()
      if (model) monaco.editor.setModelMarkers(model, 'xsd-validation', [])
    }
  }, [activeTabFilePath])

  useEffect(() => {
    if (!xmlContent || !xsdLoaded || isDiffTab) return
    runSchemaValidation(xmlContent)
  }, [xmlContent, xsdLoaded, isDiffTab, runSchemaValidation])

  useEffect(() => {
    if (!xmlContent || !activeTabFilePath || !editorReference.current || isDiffTab) return

    const editor = editorReference.current
    const model = editor.getModel()
    if (!model) return

    const lines = xmlContent.split('\n')
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
  }, [xmlContent, activeTabFilePath, isDiffTab])

  const handleOpenInStudio = useCallback(() => {
    const editorTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    if (!editorTab) return

    const xml = editorReference.current?.getValue() || xmlContent
    if (!xml) return

    const adapters = findAdaptersInXml(xml)
    if (adapters.length === 0) return

    const cursorLine = editorReference.current?.getPosition()?.lineNumber
    const adapterPosition =
      adapters.length === 1 || !cursorLine ? 0 : findAdapterIndexAtOffset(adapters, lineToOffset(xml, cursorLine))

    openInStudio(adapters[adapterPosition].name, editorTab.configurationPath, adapterPosition)
  }, [activeTabFilePath, xmlContent])

  const isGitRepo = !!project?.isGitRepository

  return (
    <SidebarLayout name="editor">
      <>
        <div className="flex h-12 items-center justify-between px-4">
          <SidebarClose side={SidebarSide.LEFT} />
          <div className="border-border flex overflow-hidden rounded border text-sm">
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
                  language="xml"
                  theme={`vs-${theme}`}
                  value={xmlContent}
                  onMount={handleEditorMount}
                  onChange={(value) => {
                    scheduleSave()
                    if (value) scheduleSchemaValidation(value)
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
