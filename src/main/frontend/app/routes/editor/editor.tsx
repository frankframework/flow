import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import { toast, ToastContainer } from 'react-toastify'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { useTheme } from '~/hooks/use-theme'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore } from '~/stores/project-store'
import EditorFileStructure from '~/components/file-structure/editor-file-structure'
import useEditorTabStore from '~/stores/editor-tab-store'
import EditorTabs from '~/components/tabs/editor-tabs'
import type { ElementDetails, Attribute, EnumValue } from '~/types/ff-doc.types'
import { useFrankDoc } from '~/providers/frankdoc-provider'
import { fetchConfiguration, saveConfiguration } from '~/services/configuration-service'
import { useNavigationStore } from '~/stores/navigation-store'
import useTabStore from '~/stores/tab-store'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'

function findAdaptersInXml(xml: string): { name: string; offset: number }[] {
  const adapters: { name: string; offset: number }[] = []
  const regex = /<Adapter\b[^>]*\bname\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    adapters.push({ name: match[1], offset: match.index })
  }
  return adapters
}

function lineToOffset(xml: string, lineNumber: number): number {
  const lines = xml.split('\n')
  let offset = 0
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  return offset
}

function findAdapterAtOffset(adapters: { name: string; offset: number }[], cursorOffset: number): string {
  for (let i = adapters.length - 1; i >= 0; i--) {
    if (adapters[i].offset <= cursorOffset) return adapters[i].name
  }
  return adapters[0].name
}

export default function CodeEditor() {
  const theme = useTheme()
  const { elements } = useFrankDoc()
  const project = useProjectStore.getState().project
  const [activeTabFilePath, setActiveTabFilePath] = useState<string>(useEditorTabStore.getState().activeTabFilePath)
  const [xmlContent, setXmlContent] = useState<string>('')
  const editorReference = useRef<Parameters<OnMount>[0] | null>(null)
  const decorationIdsReference = useRef<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const handleEditorMount: OnMount = (editor, _monacoInstance) => {
    editorReference.current = editor
  }

  useEffect(() => {
    const unsubActiveTab = useEditorTabStore.subscribe(
      (state) => state.activeTabFilePath,
      (newActiveTab) => {
        setActiveTabFilePath(newActiveTab)
      },
    )
    return () => {
      unsubActiveTab()
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()

    async function fetchXml() {
      try {
        const configPath = useEditorTabStore.getState().getTab(activeTabFilePath)?.configurationPath
        if (!configPath || !project) return
        const xmlString = await fetchConfiguration(project.name, configPath, abortController.signal)
        if (!abortController.signal.aborted) {
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
  }, [project, activeTabFilePath])

  useEffect(() => {
    if (!xmlContent || !activeTabFilePath || !editorReference.current) return

    const editor = editorReference.current

    // Wait for the editor to have a model
    const model = editor.getModel()
    if (!model) return

    const lines = xmlContent.split('\n')
    const matchIndex = lines.findIndex((line) => line.includes('<Adapter') && line.includes(activeTabFilePath))
    if (matchIndex === -1) return

    const lineNumber = matchIndex + 1

    // Reveal & highlight immediately if model exists
    editor.revealLineNearTop(lineNumber)
    editor.setPosition({ lineNumber, column: 1 })
    editor.focus()

    const newDecorations = editor.createDecorationsCollection([
      {
        range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'highlight-line',
        },
      },
    ])
    decorationIdsReference.current = newDecorations.getRanges().map(() => '')

    // Remove highlight after 2s
    const timeout = setTimeout(() => {
      newDecorations.clear()
    }, 2000)

    // Optional cleanup if component unmounts before timeout
    return () => clearTimeout(timeout)
  }, [xmlContent, activeTabFilePath])

  useEffect(() => {
    // Handles all the suggestions
    if (!editorReference.current) return
    const monacoInstance = (globalThis as { monaco?: Monaco }).monaco
    if (!monacoInstance) return

    type CompletionProvider = Parameters<Monaco['languages']['registerCompletionItemProvider']>[1]
    type ProvideCompletionItems = CompletionProvider['provideCompletionItems']
    type ITextModel = Parameters<ProvideCompletionItems>[0]
    type Position = Parameters<ProvideCompletionItems>[1]

    const isCursorInsideAttributeValue = (model: ITextModel, position: Position) => {
      const text = getTextBeforeCursor(model, position)
      return /="[^"]*$/.test(text)
    }

    const getTextBeforeCursor = (model: ITextModel, position: Position) => {
      const line = model.getLineContent(position.lineNumber)
      return line.slice(0, position.column - 1)
    }

    // Element suggestions
    const elementProvider = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: ['<'],
      provideCompletionItems: (model: ITextModel, position: Position) => {
        if (isCursorInsideAttributeValue(model, position)) {
          return { suggestions: [] }
        }

        if (!elements) return { suggestions: [] }

        return {
          suggestions: Object.values(elements).map((el) => {
            const element = el as ElementDetails
            const mandatoryAttributes = Object.entries((element.attributes || {}) as Record<string, Attribute>)
              .filter(([, attribute]) => attribute.mandatory)
              .map(([name], index) => {
                if (index === 0) return `${name}="\${1}"`
                return `${name}="\${${index + 2}}"`
              })
              .join(' ')

            const mandatoryAttributesWithSpace = mandatoryAttributes ? ` ${mandatoryAttributes}` : ''
            const openingTag = `${element.name}${mandatoryAttributesWithSpace}>`
            const closingTag = `</${element.name}>`

            const insertText = `${openingTag}$0${closingTag}`

            return {
              label: element.name,
              kind: monacoInstance.languages.CompletionItemKind.Class,
              insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: element.description || '',
            }
          }),
        }
      },
    })

    const attributeProvider = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: [' '],
      provideCompletionItems: (model: ITextModel, position: Position) => {
        if (isCursorInsideAttributeValue(model, position)) {
          return { suggestions: [] }
        }

        const textBeforeCursor = getTextBeforeCursor(model, position)
        const tagMatch = textBeforeCursor.match(/<(\w+)/)
        if (!tagMatch) return { suggestions: [] }

        const tagName = tagMatch[1]
        if (!elements) return { suggestions: [] }
        const el = elements[tagName]
        if (!el || !el.attributes) return { suggestions: [] }

        const element = el as ElementDetails

        const attributeSuggestions = Object.entries((element.attributes || {}) as Record<string, Attribute>).flatMap(
          ([attributeName, attribute]) => {
            if (attribute.enum && element.enums && element.enums[attribute.enum]) {
              const enumRecord = element.enums[attribute.enum] as Record<string, EnumValue>
              const enumValues = Object.entries(enumRecord)
              return enumValues.map(([value]) => ({
                label: `${attributeName}="${value}"`,
                kind: monacoInstance.languages.CompletionItemKind.Enum,
                insertText: `${attributeName}="${value}"`,
                documentation: (attribute.description as string) || '',
              }))
            }

            return {
              label: attributeName,
              kind: monacoInstance.languages.CompletionItemKind.Property,
              insertText: `${attributeName}="\${1}"`,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: attribute.description || '',
            }
          },
        )

        return { suggestions: attributeSuggestions }
      },
    })

    // Cleanup
    return () => {
      elementProvider.dispose()
      attributeProvider.dispose()
    }
  }, [elements])

  const handleSave = async () => {
    if (!project || !activeTabFilePath) return

    const editor = editorReference.current
    const updatedContent = editor?.getValue?.()
    if (!updatedContent) return

    setIsSaving(true)

    try {
      await saveConfiguration(project.name, activeTabFilePath, updatedContent)
      toast.success('Succesfully saved content')
    } catch (error) {
      toast.error(`Error saving configuration: ${error instanceof Error ? error.message : error}`)
      console.error('Error saving configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenInStudio = useCallback(() => {
    const editorTab = useEditorTabStore.getState().getTab(activeTabFilePath)
    if (!editorTab) return

    const xml = editorReference.current?.getValue() || xmlContent
    if (!xml) return

    const adapters = findAdaptersInXml(xml)
    if (adapters.length === 0) return

    const cursorLine = editorReference.current?.getPosition()?.lineNumber
    const adapterName =
      adapters.length === 1 || !cursorLine
        ? adapters[0].name
        : findAdapterAtOffset(adapters, lineToOffset(xml, cursorLine))

    const { setTabData, setActiveTab, getTab } = useTabStore.getState()
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        name: adapterName,
        configurationPath: editorTab.configurationPath,
        flowJson: {},
      })
    }
    setActiveTab(adapterName)
    useNavigationStore.getState().navigate('studio')
  }, [activeTabFilePath, xmlContent])

  return (
    <SidebarLayout name="editor">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Files" />
        <EditorFileStructure />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <EditorTabs />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>
        {activeTabFilePath ? (
          <>
            <div className="border-b-border bg-background flex h-12 items-center justify-between border-b p-4">
              <span>Path: {activeTabFilePath}</span>
              <button
                onClick={handleOpenInStudio}
                className="border-border bg-background hover:bg-foreground-active flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm"
                title="Open in Studio"
              >
                <RulerCrossPenIcon className="fill-foreground h-4 w-4" />
                Open in Studio
              </button>
            </div>
            <div className="h-full">
              <Editor
                language="xml"
                theme={`vs-${theme}`}
                value={xmlContent}
                onMount={handleEditorMount}
                options={{ automaticLayout: true, quickSuggestions: false }}
              />
              <ToastContainer position="bottom-right" theme={theme} closeOnClick={true} />
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="border-border bg-background/40 max-w-md rounded-2xl border border-dashed p-10 shadow-inner backdrop-blur-sm">
              <h2 className="mb-2 text-xl font-semibold">No file selected</h2>
              <p className="text-sm">Select an adapter from the file structure on the left to start editing.</p>
            </div>
          </div>
        )}
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title="Preview" />
        <div className="flex w-full items-center justify-center">
          <button
            onClick={handleSave}
            disabled={isSaving || !activeTabFilePath}
            className="border-border bg-background hover:bg-foreground-active my-2 rounded border px-3 py-1 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save XML'}
          </button>
        </div>
      </>
    </SidebarLayout>
  )
}
