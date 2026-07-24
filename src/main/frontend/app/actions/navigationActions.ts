import { type NavigateFunction } from 'react-router'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { getBaseName } from '~/utils/path-utils'

export function openInStudio(
  navigate: NavigateFunction,
  { adapterName, filepath, adapterPosition }: { adapterName: string; filepath: string; adapterPosition: number },
): void {
  const { setTabData, setActiveTab, getTab } = useTabStore.getState()

  const tabId = `${filepath}::${adapterName}::${adapterPosition}`

  const existing = getTab(tabId)
  if (existing) {
    setTabData(tabId, { ...existing, pendingRecenter: true, pendingNodeSelection: null })
  } else {
    setTabData(tabId, {
      name: adapterName,
      configurationPath: filepath,
      adapterPosition,
      flowJson: {},
      pendingRecenter: true,
    })
  }

  setActiveTab(tabId)
  navigate('/studio')
}

export function openInEditor(relativePath: string, filepath: string, navigate: NavigateFunction): void {
  const { setTabData, setActiveTab, getTab } = useEditorTabStore.getState()

  if (!getTab(filepath)) {
    setTabData(filepath, {
      name: relativePath,
      configurationPath: filepath,
    })
  }

  setActiveTab(filepath)
  navigate('/editor')
}

export function openInEditorAtElement(
  navigate: NavigateFunction,
  { subtype, filepath, name }: { subtype: string; filepath: string; name?: string },
): void {
  const editorStore = useEditorTabStore.getState()
  const fileName = getBaseName(filepath)

  if (!editorStore.getTab(filepath)) {
    editorStore.setTabData(filepath, {
      name: fileName,
      configurationPath: filepath,
    })
  }

  editorStore.setPendingHighlight({ subtype, name })
  editorStore.setActiveTab(filepath)
  navigate('/editor')
}

export function openInStudioAtNode(
  navigate: NavigateFunction,
  {
    adapterName,
    filepath,
    adapterPosition,
    subtype,
    name,
  }: {
    adapterName: string
    filepath: string
    adapterPosition: number
    subtype: string
    name: string
  },
): void {
  const { setTabData, setActiveTab, getTab } = useTabStore.getState()

  const tabId = `${filepath}::${adapterName}::${adapterPosition}`

  const existing = getTab(tabId)
  if (existing) {
    setTabData(tabId, { ...existing, pendingNodeSelection: { subtype, name }, pendingRecenter: null })
  } else {
    setTabData(tabId, {
      name: adapterName,
      configurationPath: filepath,
      adapterPosition,
      flowJson: {},
      pendingNodeSelection: { subtype, name },
    })
  }

  setActiveTab(tabId)
  navigate('/studio')
}
