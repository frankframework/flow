import Tabs, { type TabsList } from '~/components/tabs/tabs'
import Editor, { type OnMount } from '@monaco-editor/react'
import { toast, ToastContainer } from 'react-toastify'
import EditorFiles from '~/routes/editor/editor-files'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import useTabStore from '~/stores/tab-store'
import { useTheme } from '~/hooks/use-theme'
import { useEffect, useRef, useState } from 'react'
import { getXmlString } from '~/routes/studio/xml-to-json-parser'
import variables from '../../../environment/environment'
import { useFFDoc } from '@frankframework/ff-doc/react'
import { useProjectStore } from '~/stores/project-store'

export default function CodeEditor() {
  const theme = useTheme()
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements } = useFFDoc(FRANK_DOC_URL)
  const project = useProjectStore.getState().project
  const [tabs, setTabs] = useState<TabsList>(useTabStore.getState().tabs as TabsList)
  const [activeTab, setActiveTab] = useState<string | undefined>(useTabStore.getState().activeTab)
  const [xmlContent, setXmlContent] = useState<string>('')
  const editorReference = useRef<Parameters<OnMount>[0] | null>(null)
  const decorationIdsReference = useRef<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorReference.current = editor
  }

  useEffect(() => {
    const unsubTabs = useTabStore.subscribe((state) => {
      setTabs(state.tabs as TabsList)
    })
    const unsubActiveTab = useTabStore.subscribe(
      (state) => state.activeTab,
      (newActiveTab) => {
        setActiveTab(newActiveTab)
      },
    )
    return () => {
      unsubTabs()
      unsubActiveTab()
    }
  }, [])

  useEffect(() => {
    async function fetchXml() {
      try {
        const configName = useTabStore.getState().getTab(activeTab)?.configurationName
        if (!configName || !project) return
        const xmlString = await getXmlString(project.name, configName)
        setXmlContent(xmlString)
      } catch (error) {
        console.error('Failed to load XML:', error)
      }
    }

    fetchXml()
  }, [activeTab])

  useEffect(() => {
    if (!xmlContent || !activeTab || !editorReference.current) return

    const editor = editorReference.current

    // Wait for the editor to have a model
    const model = editor.getModel()
    if (!model) return

    const lines = xmlContent.split('\n')
    const matchIndex = lines.findIndex((line) => line.includes('<Adapter') && line.includes(activeTab))
    if (matchIndex === -1) return

    const lineNumber = matchIndex + 1

    // Reveal & highlight immediately if model exists
    editor.revealLineNearTop(lineNumber)
    editor.setPosition({ lineNumber, column: 1 })
    editor.focus()

    decorationIdsReference.current = editor.deltaDecorations(decorationIdsReference.current, [
      {
        range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'highlight-line',
        },
      },
    ])

    // Remove highlight after 2s
    const timeout = setTimeout(() => {
      decorationIdsReference.current = editor.deltaDecorations(decorationIdsReference.current, [])
    }, 2000)

    // Optional cleanup if component unmounts before timeout
    return () => clearTimeout(timeout)
  }, [xmlContent, activeTab])

  useEffect(() => {
    // Handles all the suggestions
    if (!editorReference.current) return
    const monacoInstance = (globalThis as any).monaco
    if (!monacoInstance) return

    const isCursorInsideAttributeValue = (model, position) => {
      const text = getTextBeforeCursor(model, position)
      return /="[^"]*$/.test(text)
    }

    const getTextBeforeCursor = (model, position) => {
      const line = model.getLineContent(position.lineNumber)
      return line.slice(0, position.column - 1)
    }

    // Element suggestions
    const elementProvider = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: ['<'],
      provideCompletionItems: (model, position) => {
        if (isCursorInsideAttributeValue(model, position)) {
          return { suggestions: [] }
        }

        if (!elements) return { suggestions: [] }

        return {
          suggestions: Object.values(elements).map((element: any) => {
            const mandatoryAttributes = Object.entries(element.attributes || {})
              .filter(([_, attribute]) => attribute.mandatory)
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

    // Attribute suggestions
    const attributeProvider = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: [' '],
      provideCompletionItems: (model, position) => {
        if (isCursorInsideAttributeValue(model, position)) {
          return { suggestions: [] }
        }

        const textBeforeCursor = getTextBeforeCursor(model, position)
        const tagMatch = textBeforeCursor.match(/<(\w+)/)
        if (!tagMatch) return { suggestions: [] }

        // (rest unchanged)

        const tagName = tagMatch[1]
        if (!elements) return
        const element = elements[tagName]
        if (!element || !element.attributes) return { suggestions: [] }

        const attributeSuggestions = Object.entries(element.attributes).flatMap(
          ([attributeName, attributeValue]: [string, any]) => {
            // Suggest enum values if defined
            const enumValues = attributeValue?.enum ? Object.keys(attributeValue.enum) : []

            return enumValues.length > 0
              ? enumValues.map((value, index) => ({
                  label: `${attributeName}="${value}"`,
                  kind: monacoInstance.languages.CompletionItemKind.Enum,
                  insertText: `${attributeName}="${value}"`,
                  documentation: attributeValue?.enum[value]?.description || '',
                }))
              : {
                  label: attributeName,
                  kind: monacoInstance.languages.CompletionItemKind.Property,
                  insertText: `${attributeName}="\${1}"`,
                  insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: attributeValue?.description || '',
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
  }, [editorReference.current, elements])

  const handleSelectTab = (key: string) => {
    useTabStore.getState().setActiveTab(key)
  }

  const handleCloseTab = (key: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    useTabStore.getState().removeTab(key)

    // Auto-select fallback if the closed tab was active
    if (key === activeTab) {
      const remainingTabs = Object.keys(useTabStore.getState().tabs)
      if (remainingTabs.length > 0) {
        useTabStore.getState().setActiveTab(remainingTabs[0])
      } else {
        useTabStore.getState().setActiveTab(undefined)
      }
    }
  }

  const handleSave = async () => {
    if (!project || !activeTab) return
    const configName = useTabStore.getState().getTab(activeTab)?.configurationName
    if (!configName) return

    const editor = editorReference.current
    const updatedXml = editor?.getValue?.()
    if (!updatedXml) return

    setIsSaving(true)

    try {
      const url = `${API_BASE_URL}projects/${project.name}/${configName}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: updatedXml }),
      })

      // Parse JSON response body if it's not OK
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          toast.error(`Error saving configuration: ${errorData.error}\nDetails: ${errorData.message}`)
          console.error('Something went wrong saving the configuration: ', errorData)
        } else {
          toast.error(`Error saving configuration. HTTP status: ${response.status}`)
          console.error('Error saving configuration. HTTP status: ', response.status)
        }
        return
      }
    } catch (error) {
      toast.error(`Network or unexpected error: ${error}`)
      console.error('Network or unexpected error: ', error)
    } finally {
      setIsSaving(false)
    }
    toast.success('Succesfully saved content')
  }

  return (
    <SidebarLayout name="editor" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Files" />
        <EditorFiles />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <Tabs tabs={tabs} selectedTab={activeTab} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>
        {activeTab ? (
          <>
            <div className="border-b-border bg-background flex h-12 items-center border-b p-4">Path: {activeTab}</div>
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
            disabled={isSaving || !activeTab}
            className="border-border bg-background hover:bg-foreground-active my-2 rounded border px-3 py-1 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save XML'}
          </button>
        </div>
      </>
    </SidebarLayout>
  )
}
