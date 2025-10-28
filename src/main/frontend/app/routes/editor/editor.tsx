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
import * as monaco from 'monaco-editor'

export default function CodeEditor() {
  const theme = useTheme()
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements } = useFFDoc(FRANK_DOC_URL)
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
        const xmlString = await getXmlString(configName)
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
    if (!elements || !editorReference.current) return

    const monacoInstance = (globalThis as any).monaco
    if (!monacoInstance) return
    console.log(elements)

    // Dispose previous provider if needed
    const disposable = monacoInstance.languages.registerCompletionItemProvider('xml', {
      triggerCharacters: ['<', ' '],
      provideCompletionItems: () => {
        return {
          suggestions: [
            {
              label: 'ABCJobListener',
              kind: monacoInstance.languages.CompletionItemKind.Class,
              insertText: 'ABCJobListener>',
              documentation: 'This is a custom suggestion for ABCJobListener',
            },
          ],
        }
      },
    })

    return () => disposable.dispose() // cleanup on unmount or elements change
  }, [elements])

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
