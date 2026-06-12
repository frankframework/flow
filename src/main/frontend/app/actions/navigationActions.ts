import { type NavigateFunction } from 'react-router'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'

export function openInStudio(
  adapterName: string,
  filepath: string,
  adapterPosition: number,
  navigate: NavigateFunction,
) {
  const { setTabData, setActiveTab, getTab } = useTabStore.getState()

  const tabId = `${filepath}::${adapterName}::${adapterPosition}`

  if (!getTab(tabId)) {
    setTabData(tabId, {
      name: adapterName,
      configurationPath: filepath,
      adapterPosition,
      flowJson: {},
    })
  }

  setActiveTab(tabId)
  navigate('/studio')
}

export function openInEditor(relativePath: string, filepath: string, navigate: NavigateFunction) {
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
  subtype: string,
  name: string | undefined,
  filepath: string,
  navigate: NavigateFunction,
) {
  const editorStore = useEditorTabStore.getState()
  const fileName = filepath.split(/[/\\]/).pop() ?? filepath

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
  adapterName: string,
  filepath: string,
  adapterPosition: number,
  subtype: string,
  name: string,
  navigate: NavigateFunction,
) {
  const { setTabData, setActiveTab, getTab } = useTabStore.getState()

  const tabId = `${filepath}::${adapterName}::${adapterPosition}`

  const existing = getTab(tabId)
  if (existing) {
    setTabData(tabId, { ...existing, pendingNodeSelection: { subtype, name } })
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
