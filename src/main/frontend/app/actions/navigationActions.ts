import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import { useNavigationStore } from '~/stores/navigation-store'

export function openInStudio(adapterName: string, filepath: string, adapterPosition: number) {
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
  useNavigationStore.getState().navigate('studio')
}

export function openInEditor(relativePath: string, filepath: string) {
  const { setTabData, setActiveTab, getTab } = useEditorTabStore.getState()

  if (!getTab(filepath)) {
    setTabData(filepath, {
      name: relativePath,
      configurationPath: filepath,
    })
  }

  setActiveTab(filepath)
  useNavigationStore.getState().navigate('editor')
}

export function openInEditorAtElement(subtype: string, name: string | undefined, filepath: string) {
  const { setTabData, setActiveTab, getTab, setPendingHighlight } = useEditorTabStore.getState()

  const fileName = filepath.split(/[/\\]/).pop() ?? filepath

  if (!getTab(filepath)) {
    setTabData(filepath, {
      name: fileName,
      configurationPath: filepath,
    })
  }

  setPendingHighlight({ subtype, name })
  setActiveTab(filepath)
  useNavigationStore.getState().navigate('editor')
}

export function openInStudioAtNode(
  adapterName: string,
  filepath: string,
  adapterPosition: number,
  subtype: string,
  name: string,
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
  useNavigationStore.getState().navigate('studio')
}
