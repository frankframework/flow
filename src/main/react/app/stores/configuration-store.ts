import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface ConfigurationStoreState {
  configurationNames: string[]
}

const useConfigurationStore = create<ConfigurationStoreState>()(
  subscribeWithSelector(() => ({
    configurationNames: ['Configuration1.xml', 'Configuration2.xml', 'Configuration3.xml'],
  })),
)

export default useConfigurationStore
