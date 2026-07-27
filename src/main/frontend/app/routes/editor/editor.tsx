import '~/utils/monaco-setup'
import * as monaco from 'monaco-editor'
type ITextModel = monaco.editor.ITextModel
type FindMatch = monaco.editor.FindMatch
type IModelDeltaDecoration = monaco.editor.IModelDeltaDecoration
type IEditorDecorationsCollection = monaco.editor.IEditorDecorationsCollection
import XsdFeatures from 'monaco-xsd-code-completion/esm/XsdFeatures'
import 'monaco-xsd-code-completion/src/style.css'
import XsdManager from 'monaco-xsd-code-completion/esm/XsdManager'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { validateXML, type XMLValidationError } from 'xmllint-wasm'
import { useShallow } from 'zustand/react/shallow'
import { openInStudio } from '~/actions/navigationActions'
import EditorFileStructure from '~/components/file-structure/editor-file-structure'
import DiffTabView from '~/components/git/diff-tab-view'
import GitPanel from '~/components/git/git-panel'
import SegmentedButton from '~/components/inputs/segmented-button'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import EditorTabs from '~/components/tabs/editor-tabs'
import { SaveStatusIndicator } from '~/components/save-status-indicator'
import useToasts from '~/components/toast/use-toasts'
import { useSaveStatusStore } from '~/stores/save-status-store'
import { useTheme } from '~/hooks/use-theme'
import { fetchConfigurationFile, saveConfigurationFile } from '~/services/configuration-file-service'
import { fetchFile, updateFile } from '~/services/file-service'
import { refreshOpenDiffs } from '~/services/git-service'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import useEditorTabStore, { type DiffTabData, type PendingHighlight } from '~/stores/editor-tab-store'
import { useProjectStore } from '~/stores/project-store'
import { useSettingsStore } from '~/stores/settings-store'
import flowXsd from '../../../src/assets/xsd/FlowConfig.xsd?raw'
import {
  ADAPTER_GLYPH_SUBTYPE,
  extractFlowElements,
  findElementRangeInXml,
  findFrankElementsForGlyphs,
  findFlowElementsStartLine,
  wrapFlowXml,
} from './xml-utils'
import { openInStudioAtNode } from '~/actions/navigationActions'

type LeftTab = 'files' | 'git'
export type ValidationError = {
  message: string
  lineNumber: number
  startColumn: number
  endColumn: number
}

export type TextModel = {
  getLineContent: (n: number) => string
  getLineCount: () => number
  getLineMaxColumn: (n: number) => number
}

type CachedFile = {
  content: string
  type: string
}

const ELEMENT_ERROR_RE = /[Ee]lement [\u{2018}\u{2019}'"{]?([\w:.-]+)[\u{2018}\u{2019}'"}]?/u
const ATTRIBUTE_ERROR_RE = /[Aa]ttribute [\u{2018}\u{2019}'"{]?([\w:.-]+)[\u{2018}\u{2019}'"}]?/u

function extractLocalName(name: string): string {
  return name.includes(':') ? name.split(':').pop()! : name
}

function findElementRange(lineContent: string, localName: string): { startColumn: number; endColumn: number } | null {
  const openIndex = lineContent.indexOf(`<${localName}`)
  if (openIndex !== -1) return { startColumn: openIndex + 1, endColumn: openIndex + 1 + localName.length + 1 }
  const closeIndex = lineContent.indexOf(`</${localName}`)
  if (closeIndex !== -1) return { startColumn: closeIndex + 1, endColumn: closeIndex + 2 + localName.length + 1 }
  return null
}

function findAttributeRange(lineContent: string, localName: string): { startColumn: number; endColumn: number } | null {
  const index = lineContent.search(new RegExp(String.raw`\b${localName}\s*=`))
  if (index < 0) return null
  return { startColumn: index + 1, endColumn: index + localName.length + 1 }
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

  const attributeMatch = message.match(ATTRIBUTE_ERROR_RE)
  if (attributeMatch) {
    const range = findAttributeRange(lineContent, extractLocalName(attributeMatch[1]))
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
    .map((error): { message: string; lineNumber: number; startColumn: number; endColumn: number } => {
      const lineNumber = Math.max(1, Math.min(error.loc?.lineNumber ?? 1, totalLines))
      const { startColumn, endColumn } = findErrorRange(model.getLineContent(lineNumber), error.message)
      return { message: error.message, lineNumber, startColumn, endColumn }
    })
    .filter((error): boolean => {
      if (seen.has(error.lineNumber)) return false
      seen.add(error.lineNumber)
      return true
    })
}

function toDecoration(error: ValidationError): {
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }
  options: {
    inlineClassName: string
    hoverMessage: { value: string }
    overviewRuler: { color: string; position: number }
  }
} {
  return {
    range: {
      startLineNumber: error.lineNumber,
      startColumn: error.startColumn,
      endLineNumber: error.lineNumber,
      endColumn: error.endColumn,
    },
    options: {
      inlineClassName: 'xml-lint xml-lint--fatal-error',
      hoverMessage: { value: `**XSD:** ${error.message}` },
      overviewRuler: { color: '#ff2424', position: 4 },
    },
  }
}

function toMarker(
  error: ValidationError,
  severity: number,
): {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  message: string
  severity: number
} {
  return {
    startLineNumber: error.lineNumber,
    startColumn: error.startColumn,
    endLineNumber: error.lineNumber,
    endColumn: error.endColumn,
    message: error.message,
    severity,
  }
}

function toMonacoType(type: string | null): string {
  if (!type || type === 'text/plain') return 'plaintext'
  return type.split('/').pop() ?? ''
}

function isConfigurationFile(fileExtension: string): boolean {
  return fileExtension === 'xml'
}

async function validateFlow(content: string, model: ITextModel): Promise<ValidationError[]> {
  const flowFragment = extractFlowElements(content)
  if (!flowFragment) return []

  const wrapped = wrapFlowXml(flowFragment)
  const startLine = findFlowElementsStartLine(content)

  const flowResult = await validateXML({
    xml: [{ fileName: 'flow.xml', contents: wrapped }],
    schema: [{ fileName: 'flowconfig.xsd', contents: flowXsd }],
  })

  if (model.isDisposed()) return []

  return mapToValidationErrors(flowResult.errors, model).map(
    (error): { lineNumber: number; startColumn: number; endColumn: number; message: string } => ({
      ...error,
      lineNumber: error.lineNumber + startLine,
      startColumn: 1,
      endColumn: model.getLineLength(error.lineNumber + startLine),
    }),
  )
}

async function validateConfiguration(content: string, xsd: string, model: ITextModel): Promise<ValidationError[]> {
  const result = await validateXML({
    xml: [{ fileName: 'config.xml', contents: content }],
    schema: [{ fileName: 'FrankConfig.xsd', contents: xsd }],
  })

  if (model.isDisposed()) return []

  if (!result.valid && result.errors.length === 0) {
    return [notWellFormedError(model)]
  }

  const filtered = result.errors.filter(
    (error): boolean =>
      !error.message.includes('{urn:frank-flow}') && !error.message.includes('Skipping attribute use prohibition'),
  )

  return mapToValidationErrors(filtered, model)
}

/**
 * Maps a single Monaco regex match to decoration objects.
 */
function mapMatchToDecorations(match: FindMatch): IModelDeltaDecoration[] {
  const keyText = match.matches![1]
  const equalsText = match.matches![2]
  const valueText = match.matches![3]
  const keyStart = match.range.startColumn
  const equalsStart = keyStart + keyText.length
  const valueStart = match.range.endColumn - valueText.length

  return [
    {
      range: {
        startLineNumber: match.range.startLineNumber,
        startColumn: keyStart,
        endLineNumber: match.range.startLineNumber,
        endColumn: equalsStart,
      },
      options: { inlineClassName: 'monaco-flow-attribute' },
    },
    {
      range: {
        startLineNumber: match.range.startLineNumber,
        startColumn: equalsStart,
        endLineNumber: match.range.startLineNumber,
        endColumn: equalsStart + equalsText.length,
      },
      options: { inlineClassName: 'monaco-flow-attribute' },
    },
    {
      range: {
        startLineNumber: match.range.startLineNumber,
        startColumn: valueStart,
        endLineNumber: match.range.startLineNumber,
        endColumn: match.range.endColumn,
      },
      options: { inlineClassName: 'monaco-flow-attribute-value' },
    },
  ]
}

export default function CodeEditor(): JSX.Element {
  const theme = useTheme()
  const project = useProjectStore.getState().project
  const [activeTabFilePath, setActiveTabFilePath] = useState<string>(useEditorTabStore.getState().activeTabFilePath)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileLanguage, setFileLanguage] = useState<string>('xml')
  const { setSaving, setSaved, setIdle } = useSaveStatusStore()
  const [leftTab, setLeftTab] = useState<LeftTab>('files')
  const [editorMounted, setEditorMounted] = useState(false)
  const [xsdLoaded, setXsdLoaded] = useState(false)
  const containerReference = useRef<HTMLDivElement>(null)
  const editorReference = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const xsdContentReference = useRef<string | null>(null)
  const errorDecorationsReference = useRef<{ clear: () => void } | null>(null)
  const flowDecorationsReference = useRef<IEditorDecorationsCollection | null>(null)
  const highlightDecorationsReference = useRef<IEditorDecorationsCollection | null>(null)
  const frankGlyphsDecorationsReference = useRef<IEditorDecorationsCollection | null>(null)
  const frankElementsReference = useRef<ReturnType<typeof findFrankElementsForGlyphs>>([])
  const debounceTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationCounterReference = useRef(0)
  const contentCacheReference = useRef<Map<string, CachedFile>>(new Map())
  const syncingValueReference = useRef(false)
  const navigate = useNavigate()
  const { logApiError } = useToasts()

  const [pendingHighlight, setPendingHighlightLocal] = useState<{ subtype: string; name?: string } | null>(
    (): PendingHighlight | null => useEditorTabStore.getState().pendingHighlight,
  )

  const activeTab = useEditorTabStore(
    useShallow(
      (
        state,
      ): { configurationPath: string | undefined; type: 'editor' | 'diff'; diffData: DiffTabData | undefined } => {
        const tab = state.activeTabFilePath ? state.tabs[state.activeTabFilePath] : undefined
        return {
          configurationPath: tab?.configurationPath,
          type: tab?.type ?? 'editor',
          diffData: tab?.diffData,
        }
      },
    ),
  )

  const refreshCounter = useEditorTabStore((state): number => state.refreshCounter)
  const lastRefreshCounterReference = useRef(refreshCounter)

  const isDiffTab = activeTab.type === 'diff'

  const applyFlowHighlighter = useCallback((): void => {
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

    const decorations = matches.flatMap((match): monaco.editor.IModelDeltaDecoration[] => mapMatchToDecorations(match))

    if (flowDecorationsReference.current) {
      flowDecorationsReference.current.set(decorations)
    } else {
      flowDecorationsReference.current = editor.createDecorationsCollection(decorations)
    }
  }, [fileLanguage])

  const applyFrankGlyphs = useCallback(
    (content: string): void => {
      const editor = editorReference.current
      if (!editor || fileLanguage !== 'xml') return

      const elements = findFrankElementsForGlyphs(content)
      frankElementsReference.current = elements

      const decorations = elements.map(
        (
          element,
        ): {
          range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }
          options: { glyphMarginClassName: string; glyphMarginHoverMessage: { value: string } }
        } => {
          const isAdapter = element.subtype === ADAPTER_GLYPH_SUBTYPE
          return {
            range: {
              startLineNumber: element.startLine,
              startColumn: 1,
              endLineNumber: element.startLine,
              endColumn: 1,
            },
            options: {
              glyphMarginClassName: isAdapter ? 'frank-adapter-glyph' : 'frank-node-glyph',
              glyphMarginHoverMessage: {
                value: isAdapter ? `Open adapter **${element.name}** in Studio` : `Open **${element.name}** in Studio`,
              },
            },
          }
        },
      )

      if (frankGlyphsDecorationsReference.current) {
        frankGlyphsDecorationsReference.current.set(decorations)
      } else if (decorations.length > 0) {
        frankGlyphsDecorationsReference.current = editor.createDecorationsCollection(decorations)
      }
    },
    [fileLanguage],
  )

  const performSave = useCallback(
    (content?: string): void => {
      if (!project || !activeTabFilePath || isDiffTab) return

      const updatedContent = content ?? editorReference.current?.getValue?.()
      if (!updatedContent) return

      const activeTab = useEditorTabStore.getState().getTab(activeTabFilePath)
      const fileExtension = activeTab?.name.split('.').pop()?.toLowerCase()
      const configPath = activeTab?.configurationPath
      if (!configPath) return

      function finishSaving(): void {
        setSaved()
      }

      setSaving()
      if (isConfigurationFile(fileExtension ?? '')) {
        saveConfigurationFile(project.name, configPath, updatedContent)
          .then(({ xmlContent }): void => {
            contentCacheReference.current.set(activeTabFilePath, { type: 'xml', content: xmlContent })
            finishSaving()
            if (project.isGitRepository) refreshOpenDiffs(project.name)
          })
          .catch((error): void => {
            logApiError('Error saving', error)
            setIdle()
          })
      } else {
        updateFile(project.name, configPath, updatedContent)
          .then((): void => finishSaving())
          .catch((error): void => {
            logApiError('Error saving', error)
            setIdle()
          })
      }
    },
    [project, activeTabFilePath, isDiffTab, setSaving, setSaved, logApiError, setIdle],
  )

  const flushPendingSave = useCallback((): void => {
    if (!debounceTimerReference.current) {
      return
    }

    clearTimeout(debounceTimerReference.current)
    debounceTimerReference.current = null
    performSave()
  }, [performSave])

  const autosaveEnabled = useSettingsStore((s): boolean => s.general.autoSave.enabled)
  const autosaveDelay = useSettingsStore((s): number => s.general.autoSave.delayMs)

  const scheduleSave = useCallback((): void => {
    if (!autosaveEnabled) return
    if (debounceTimerReference.current) clearTimeout(debounceTimerReference.current)
    debounceTimerReference.current = setTimeout((): void => {
      debounceTimerReference.current = null
      performSave()
    }, autosaveDelay)
  }, [performSave, autosaveEnabled, autosaveDelay])

  useEffect((): (() => void) => {
    return (): void => {
      if (debounceTimerReference.current) clearTimeout(debounceTimerReference.current)
      if (validationTimerReference.current) clearTimeout(validationTimerReference.current)
    }
  }, [])

  const applyValidationDecorations = useCallback((errors: ValidationError[]): void => {
    const editor = editorReference.current
    if (!editor) return

    const model = editor.getModel()
    if (!model) return

    if (errorDecorationsReference.current) {
      errorDecorationsReference.current.clear()
      errorDecorationsReference.current = null
    }

    if (errors.length > 0) {
      errorDecorationsReference.current = editor.createDecorationsCollection(
        errors.map(
          (
            element,
          ): {
            range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }
            options: {
              inlineClassName: string
              hoverMessage: { value: string }
              overviewRuler: { color: string; position: number }
            }
          } => toDecoration(element),
        ),
      )
    }

    monaco.editor.setModelMarkers(
      model,
      'xsd-validation',
      errors.map(
        (
          error,
        ): {
          startLineNumber: number
          startColumn: number
          endLineNumber: number
          endColumn: number
          message: string
          severity: number
        } => toMarker(error, monaco.MarkerSeverity.Error),
      ),
    )
  }, [])

  const runReformat = useCallback(async (): Promise<void> => {
    const editor = editorReference.current
    if (!editor || !project || !activeTabFilePath) return

    const activeTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    const configPath = activeTab?.configurationPath
    if (!configPath) return

    try {
      const current = editor.getValue()
      const { xmlContent } = await saveConfigurationFile(project.name, configPath, current, true)
      contentCacheReference.current.set(activeTabFilePath, { type: 'xml', content: xmlContent })

      const selection = editor.getSelection()
      editor.pushUndoStop()
      editor.executeEdits(
        'reformat',
        [{ range: editor.getModel()!.getFullModelRange(), text: xmlContent, forceMoveMarkers: true }],
        selection ? [selection] : undefined,
      )
      editor.pushUndoStop()
    } catch (error) {
      logApiError('Failed to reformat XML', error as Error)
    }
  }, [project, activeTabFilePath, logApiError])

  const runSchemaValidation = useCallback(
    async (content: string): Promise<void> => {
      const editor = editorReference.current
      const xsdContent = xsdContentReference.current
      if (!editor || !xsdContent) return

      const validationId = ++validationCounterReference.current
      const model = editor.getModel() as ITextModel
      if (!model) return

      try {
        const [flowErrors, frankErrors] = await Promise.all([
          validateFlow(content, model),
          validateConfiguration(content, xsdContent, model),
        ])

        if (validationId !== validationCounterReference.current) return

        applyValidationDecorations([...frankErrors, ...flowErrors])
      } catch {
        if (validationId === validationCounterReference.current && !model.isDisposed()) {
          applyValidationDecorations([notWellFormedError(model)])
        }
      }
    },
    [applyValidationDecorations],
  )

  const scheduleSchemaValidation = useCallback(
    (content: string): void => {
      if (validationTimerReference.current) clearTimeout(validationTimerReference.current)
      validationTimerReference.current = setTimeout((): void => {
        validationTimerReference.current = null
        runSchemaValidation(content)
      }, 800)
    },
    [runSchemaValidation],
  )

  const performSaveReference = useRef(performSave)
  const runReformatReference = useRef(runReformat)
  const scheduleSaveReference = useRef(scheduleSave)
  const onChangeReference = useRef<((value: string) => void) | null>(null)

  useEffect((): void => {
    performSaveReference.current = performSave
  }, [performSave])

  useEffect((): void => {
    runReformatReference.current = runReformat
  }, [runReformat])

  useEffect((): void => {
    scheduleSaveReference.current = scheduleSave
  }, [scheduleSave])

  useEffect((): void => {
    onChangeReference.current = (value: string): void => {
      scheduleSaveReference.current()
      if (value && fileLanguage === 'xml') {
        scheduleSchemaValidation(value)
        applyFlowHighlighter()
      }
    }
  }, [scheduleSchemaValidation, applyFlowHighlighter, fileLanguage])

  useEffect((): void => {
    if (!editorMounted || !editorReference.current) return

    const xsdManager = new XsdManager(editorReference.current)
    const xsdFeatures = new XsdFeatures(xsdManager, monaco, editorReference.current)

    xsdFeatures.addCompletion()
    xsdFeatures.addGenerateAction()

    fetchFrankConfigXsd()
      .then((xsdContent): void => {
        xsdContentReference.current = xsdContent
        xsdManager.set({ path: 'FrankConfig.xsd', value: xsdContent, namespace: 'xs', alwaysInclude: true })
        xsdManager.set({ path: 'FlowConfig.xsd', value: flowXsd, namespace: 'xs', alwaysInclude: true })
        setXsdLoaded(true)
      })
      .catch(console.error)
  }, [editorMounted])

  const showCodeEditor = !!activeTabFilePath && !isDiffTab

  useEffect((): (() => void) | undefined => {
    if (!showCodeEditor || !containerReference.current || editorReference.current) return

    const editor = monaco.editor.create(containerReference.current, {
      value: '',
      language: 'xml',
      automaticLayout: true,
      quickSuggestions: false,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      glyphMargin: true,
    })

    editorReference.current = editor
    frankGlyphsDecorationsReference.current = null
    setEditorMounted(true)

    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: (): void => {
        if (debounceTimerReference.current) {
          clearTimeout(debounceTimerReference.current)
          debounceTimerReference.current = null
        }
        performSaveReference.current()
      },
    })

    editor.addAction({
      id: 'reformat-xml',
      label: 'Reformat',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: (): Promise<void> => runReformatReference.current(),
    })

    editor.onMouseDown((event): void => {
      if (highlightDecorationsReference.current) {
        highlightDecorationsReference.current.clear()
        highlightDecorationsReference.current = null
      }

      if (event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = event.target.position?.lineNumber
        if (!lineNumber) return

        const editorTab = useEditorTabStore.getState().getTab(useEditorTabStore.getState().activeTabFilePath)
        if (!editorTab) return

        const element = frankElementsReference.current.find((element): boolean => element.startLine === lineNumber)
        if (!element) return

        const { adapterName, adapterPosition, subtype, name } = element

        if (subtype === ADAPTER_GLYPH_SUBTYPE) {
          openInStudio(navigate, {
            adapterName,
            adapterPosition,
            filepath: editorTab.configurationPath,
          })
          return
        }

        openInStudioAtNode(navigate, {
          adapterName,
          adapterPosition,
          subtype,
          name,
          filepath: editorTab.configurationPath,
        })
      }
    })

    editor.onDidChangeModelContent((): void => {
      if (syncingValueReference.current) return
      onChangeReference.current?.(editor.getValue())
    })

    return (): void => {
      editor.dispose()
      editorReference.current = null
      setEditorMounted(false)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCodeEditor])

  useEffect((): void => {
    const editor = editorReference.current
    if (!editor || editor.getValue() === fileContent) return

    syncingValueReference.current = true
    editor.setValue(fileContent)
    syncingValueReference.current = false
  }, [fileContent])

  useEffect((): void => {
    const editor = editorReference.current
    if (!editor) return

    const model = editor.getModel()
    if (model) monaco.editor.setModelLanguage(model, fileLanguage)
  }, [fileLanguage])

  useEffect((): void => {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
  }, [theme])

  useEffect((): (() => void) => {
    return useEditorTabStore.subscribe(
      (state): string => state.activeTabFilePath,
      (newActiveTab, oldActiveTab): void => {
        if (oldActiveTab && oldActiveTab !== newActiveTab) {
          const currentEditor = editorReference.current
          if (currentEditor) {
            const content = currentEditor.getValue()
            const type = currentEditor.getModel()?.getLanguageId() || 'xml'
            contentCacheReference.current.set(oldActiveTab, { type, content })
          }
          flushPendingSave()
        }
        setActiveTabFilePath(newActiveTab)
      },
    )
  }, [flushPendingSave])

  useEffect((): (() => void) | undefined => {
    if (isDiffTab) return

    function setMonacoContent(content: string, type: string, abortSignal?: AbortSignal): void {
      if (abortSignal && abortSignal.aborted) {
        return
      }

      contentCacheReference.current.set(activeTabFilePath, { type, content })
      setFileContent(content)
      setFileLanguage(type)
    }

    const abortController = new AbortController()
    const activeTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    if (!activeTab || !project) return

    const filePath = activeTab?.configurationPath
    const fileExtension = activeTab.name.split('.').pop()?.toLowerCase()
    const isForceRefresh = refreshCounter !== lastRefreshCounterReference.current
    lastRefreshCounterReference.current = refreshCounter

    if (!isForceRefresh) {
      const cached = contentCacheReference.current.get(activeTabFilePath)
      if (cached !== undefined) {
        setFileContent(cached.content)
        setFileLanguage(cached.type)
        return
      }
    }

    if (isConfigurationFile(fileExtension ?? '')) {
      fetchConfigurationFile(project.name, filePath, abortController.signal)
        .then((content): void => setMonacoContent(content, 'xml', abortController.signal))
        .catch((error): void => {
          if (!abortController.signal.aborted) {
            logApiError('Failed to load configuration XML:', error)
          }
        })
    } else {
      fetchFile(project.name, filePath, abortController.signal)
        .then(({ content, type }): void => {
          const fileType = toMonacoType(type)
          setMonacoContent(content, fileType, abortController.signal)
        })
        .catch((error): void => {
          if (abortController.signal.aborted) {
            return
          }

          setMonacoContent('', 'plaintext', abortController.signal)
          logApiError('Failed to load file:', error)
        })
    }
    return (): void => abortController.abort()
  }, [project, activeTabFilePath, isDiffTab, refreshCounter, logApiError])

  useEffect((): void => {
    if (errorDecorationsReference.current) {
      errorDecorationsReference.current.clear()
      errorDecorationsReference.current = null
    }
    if (flowDecorationsReference.current) {
      flowDecorationsReference.current.set([])
    }
    if (frankGlyphsDecorationsReference.current) {
      frankGlyphsDecorationsReference.current.clear()
      frankGlyphsDecorationsReference.current = null
    }
    const editor = editorReference.current
    const model = editor?.getModel()
    if (model) monaco.editor.setModelMarkers(model, 'xsd-validation', [])
  }, [activeTabFilePath])

  useEffect((): void => {
    if (!fileContent || !xsdLoaded || isDiffTab || fileLanguage !== 'xml') return
    runSchemaValidation(fileContent)
    applyFlowHighlighter()
  }, [fileContent, xsdLoaded, isDiffTab, runSchemaValidation, fileLanguage, applyFlowHighlighter])

  useEffect((): void => {
    if (!fileContent || !editorMounted || isDiffTab || fileLanguage !== 'xml') return
    applyFrankGlyphs(fileContent)
  }, [fileContent, editorMounted, isDiffTab, fileLanguage, applyFrankGlyphs])

  useEffect((): (() => void) | undefined => {
    if (!fileContent || !activeTabFilePath || isDiffTab || !editorReference.current) return

    const editor = editorReference.current
    const model = editor.getModel()
    if (!model) return

    const lines = fileContent.split('\n')
    const matchIndex = lines.findIndex((line): boolean => line.includes('<Adapter') && line.includes(activeTabFilePath))
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

    const timeout = setTimeout((): void => decorations.clear(), 2000)
    return (): void => clearTimeout(timeout)
  }, [fileContent, activeTabFilePath, isDiffTab])

  useEffect((): (() => void) => {
    return useEditorTabStore.subscribe(
      (state): PendingHighlight | null => state.pendingHighlight,
      (highlight): void => setPendingHighlightLocal(highlight),
    )
  }, [])

  useEffect((): void => {
    if (!pendingHighlight || !fileContent || isDiffTab || !editorReference.current) return

    const editor = editorReference.current
    const range = findElementRangeInXml(fileContent, pendingHighlight.subtype, pendingHighlight.name)

    useEditorTabStore.getState().setPendingHighlight(null)

    if (!range) return

    editor.revealLineNearTop(range.startLine)
    editor.setPosition({ lineNumber: range.startLine, column: 1 })
    editor.focus()

    highlightDecorationsReference.current?.clear()

    highlightDecorationsReference.current = editor.createDecorationsCollection([
      {
        range: { startLineNumber: range.startLine, startColumn: 1, endLineNumber: range.endLine, endColumn: 1 },
        options: { isWholeLine: true, className: 'highlight-line' },
      },
    ])
  }, [pendingHighlight, fileContent, isDiffTab, editorMounted])

  const isGitRepo = !!project?.isGitRepository

  return (
    <SidebarLayout name="editor" windowResizeOnChange={true}>
      <>
        <div className="flex h-12 items-center justify-between pr-4">
          <SidebarHeader side={SidebarSide.LEFT} title="Files" />
          {isGitRepo && (
            <div className="border-border ml-auto flex overflow-hidden rounded border">
              <SegmentedButton isActive={leftTab === 'files'} onClick={(): void => setLeftTab('files')}>
                Files
              </SegmentedButton>
              <SegmentedButton
                isActive={leftTab === 'git'}
                onClick={(): void => setLeftTab('git')}
                className="border-border border-l"
              >
                Git
              </SegmentedButton>
            </div>
          )}
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
            <div className="flex h-full flex-col">
              <div className="border-b-border bg-background flex h-10 shrink-0 items-center border-b px-3">
                <SaveStatusIndicator />
              </div>
              <div className="relative min-h-0 flex-1">
                <div ref={containerReference} className="h-full w-full" />
              </div>
            </div>
          )
        ) : (
          <div className="text-foreground-muted flex h-full flex-col items-center justify-center p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">No file selected</h2>
            <p className="text-sm">Select a file from the file structure on the left to start editing.</p>
          </div>
        )}
      </>
    </SidebarLayout>
  )
}
