import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import { useEffect, useState } from 'react'
import useConfigurationStore from '~/stores/configuration-store'
import { getAdapterNamesFromConfiguration } from '~/routes/builder/xml-to-json-parser'
import useTabStore from '~/stores/tab-store'
import Search from '~/components/search/search'

interface ConfigWithAdapters {
  configName: string
  adapterNames: string[]
}

export default function BuilderStructure() {
  const [configs, setConfigs] = useState<ConfigWithAdapters[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const configurationNames = useConfigurationStore((state) => state.configurationNames)
  const setTabData = useTabStore((state) => state.setTabData)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const getTab = useTabStore((state) => state.getTab)

  useEffect(() => {
    const loadAdapters = async () => {
      try {
        const loaded: ConfigWithAdapters[] = await Promise.all(
          configurationNames.map(async (configName) => {
            const adapterNames = await getAdapterNamesFromConfiguration(configName)
            return { configName, adapterNames }
          }),
        )
        setConfigs(loaded)
      } catch (error) {
        console.error('Failed to load adapter names:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAdapters()
  }, [configurationNames])

  const openNewTab = (adapterName: string, configName: string) => {
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        value: adapterName,
        configurationName: configName,
        flowJson: {},
      })
    }

    setActiveTab(adapterName)
  }

  return (
    <>
      <Search onChange={console.log} />
      {isLoading ? (
        <p>Loading configurations...</p>
      ) : (
        <ul className="px-4">
          {configs.map(({ configName, adapterNames }) => (
            <li key={configName} className="mb-2">
              <strong className="text-foreground">{configName}</strong>
              <ul className="text-foreground ml-6 text-sm">
                {adapterNames.map((adapter) => (
                  <li
                    key={adapter}
                    onDoubleClick={() => openNewTab(adapter, configName)}
                    className="hover:text-foreground-active selected:text-foreground-active overflow-ellipsis whitespace-nowrap"
                  >
                    - {adapter}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
