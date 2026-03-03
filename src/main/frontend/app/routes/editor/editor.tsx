import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import XsdManager from 'monaco-xsd-code-completion/esm/XsdManager'
import XsdFeatures from 'monaco-xsd-code-completion/esm/XsdFeatures'
import 'monaco-xsd-code-completion/src/style.css'
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
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import { openInStudio } from '~/actions/navigationActions'
import Button from '~/components/inputs/button'
import { showErrorToastFrom } from '~/components/toast'
import GitPanel from '~/components/git/git-panel'
import DiffTabView from '~/components/git/diff-tab-view'
import clsx from 'clsx'
import { refreshOpenDiffs } from '~/services/git-service'
import { findAdaptersInXml, lineToOffset, findAdapterIndexAtOffset, normalizeFrankElements } from './xml-utils'
import { useSettingsStore } from '~/stores/settings-store'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'

type LeftTab = 'files' | 'git'
type SaveStatus = 'idle' | 'saving' | 'saved'

const SAVED_DISPLAY_DURATION = 2000

export default function CodeEditor() {
  const theme = useTheme()
  const project = useProjectStore.getState().project
  const { xsdContent } = useFrankConfigXsd()
  const [activeTabFilePath, setActiveTabFilePath] = useState<string>(useEditorTabStore.getState().activeTabFilePath)
  const [xmlContent, setXmlContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [leftTab, setLeftTab] = useState<LeftTab>('files')
  const [editorMounted, setEditorMounted] = useState(false)
  const editorReference = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoReference = useRef<Monaco | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        await saveConfiguration(project.name, configPath, updatedContent)
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
    }
  }, [])

  useEffect(() => {
    if (!editorMounted || !xsdContent || !editorReference.current || !monacoReference.current) return
    const xsdManager = new XsdManager(editorReference.current)
    xsdManager.set({ path: 'FrankConfig.xsd', value: xsdContent, alwaysInclude: true })
    const xsdFeatures = new XsdFeatures(xsdManager, monacoReference.current, editorReference.current)
    xsdFeatures.addCompletion()
    xsdFeatures.addValidation()
    xsdFeatures.addReformatAction()
  }, [editorMounted, xsdContent])

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
    const unsubActiveTab = useEditorTabStore.subscribe(
      (state) => state.activeTabFilePath,
      (newActiveTab, oldActiveTab) => {
        if (oldActiveTab && oldActiveTab !== newActiveTab) flushPendingSave()
        setActiveTabFilePath(newActiveTab)
      },
    )
    return unsubActiveTab
  }, [flushPendingSave])

  useEffect(() => {
    if (isDiffTab) return

    const abortController = new AbortController()

    async function fetchXml() {
      try {
        const configPath = useEditorTabStore.getState().getTab(activeTabFilePath)?.configurationPath
        if (!configPath || !project) return
        const xmlString = await fetchConfiguration(project.name, configPath, abortController.signal)
        if (!abortController.signal.aborted) setXmlContent(xmlString)
      } catch (error) {
        if (!abortController.signal.aborted) console.error('Failed to load XML:', error)
      }
    }

    fetchXml()
    return () => abortController.abort()
  }, [project, activeTabFilePath, isDiffTab, refreshCounter])

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
                <span>Path: {activeTab.configurationPath}</span>
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
                  onChange={scheduleSave}
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
