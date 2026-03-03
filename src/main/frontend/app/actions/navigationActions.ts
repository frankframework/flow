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
