import Tabs, { type TabsList } from '~/components/tabs/tabs'
import Editor from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import useTabStore from '~/stores/tab-store'
import { useTheme } from '~/hooks/use-theme'
import { useEffect, useRef, useState } from 'react'
import { getXmlString } from '~/routes/builder/xml-to-json-parser'
import variables from '../../../environment/environment'
import { useFFDoc } from '@frankframework/ff-doc/react'
import {useProjectStore} from "~/stores/project-store";

export default function CodeEditor() {
  const theme = useTheme()
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements } = useFFDoc(FRANK_DOC_URL)
  const project = useProjectStore.getState().project
  const [tabs, setTabs] = useState<TabsList>(useTabStore.getState().tabs as TabsList)
  const [activeTab, setActiveTab] = useState<string | undefined>(useTabStore.getState().activeTab)
  const [xmlContent, setXmlContent] = useState<string>('')
  const editorReference = useRef<any>(null)
  const decorationIdsReference = useRef<string[]>([])

  const handleEditorMount = (editor: any, monaco: any) => {
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
        if (!configName) return
        const xmlString = await getXmlString(project!.name, configName)
        setXmlContent(xmlString)
      } catch (error) {
        console.error('Failed to load XML:', error)
      }
    }

    fetchXml()
  }, [activeTab])

  useEffect(() => {
    // Highlights the line of the adapter which is selected
    if (!xmlContent || !activeTab || !editorReference.current) return

    const editor = editorReference.current
    const lines = xmlContent.split('\n')
    const matchIndex = lines.findIndex((line) => line.includes('<Adapter') && line.includes(activeTab))
    if (matchIndex === -1) return

    const lineNumber = matchIndex + 1

    // reveal and position
    setTimeout(() => {
      editor.revealLineNearTop(lineNumber)
      editor.setPosition({ lineNumber, column: 1 })
      editor.focus()

      // apply highlight decoration
      decorationIdsReference.current = editor.deltaDecorations(decorationIdsReference.current, [
        {
          range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'highlight-line',
          },
        },
      ])

      // remove highlight after 2s
      const t = setTimeout(() => {
        decorationIdsReference.current = editor.deltaDecorations(decorationIdsReference.current, [])
      }, 2000)

      // optional cleanup if component unmounts before timeout
      return () => clearTimeout(t)
    }, 50)
  }, [xmlContent, activeTab])

  useEffect(() => {
    // Handles all the suggestions
    if (!editorReference.current) return
    const monacoInstance = (globalThis as any).monaco
    if (!monacoInstance) return

    // Keep latest elements in a ref so provider callbacks always see current data
    const elementsReference = { current: elements }

    // Element suggestions
    const elementProvider = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: ['<'],
      provideCompletionItems: () => {
        return {
          suggestions: Object.values(elementsReference.current).map((element: any) => {
            // Mandatory attributes
            const mandatoryAttributes = Object.entries(element.attributes || {})
              .filter(([_, attribute]) => attribute.mandatory)
              .map(([name]) => `${name}="\${${name}}"`)

            // Snippet for tag + mandatory attributes
            // eslint-disable-next-line sonarjs/no-nested-template-literals
            const insertText = `${element.name}${mandatoryAttributes.length > 0 ? ` ${mandatoryAttributes.join(' ')}` : ''}>$0</${element.name}`

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
        const line = model.getLineContent(position.lineNumber)
        const textBeforeCursor = line.slice(0, position.column - 1)

        // Don't show suggestions if cursor is inside quotes
        const quotesBefore = (textBeforeCursor.match(/"/g) || []).length
        if (quotesBefore % 2 === 1) {
          // Odd number of quotes -> cursor is inside an attribute value
          return { suggestions: [] }
        }

        const tagMatch = line.slice(0, position.column - 1).match(/<(\w+)/)
        if (!tagMatch) return { suggestions: [] }

        const tagName = tagMatch[1]
        const element = (elementsReference.current as any)[tagName]
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
        </div>
        <div className="border-b-border bg-background flex h-12 items-center border-b p-4">Path: {activeTab}</div>
        <div className="h-full">
          <Editor
            language="xml"
            theme={`vs-${theme}`}
            value={xmlContent}
            onMount={handleEditorMount}
            options={{ automaticLayout: true }}
          />
        </div>
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title="Preview" />
        <div className="h-full">Preview</div>
      </>
    </SidebarLayout>
  )
}
