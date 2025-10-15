import '/styles/markdown.css'
import SettingsMenuItems, { type SettingsMenuItem } from './settings-menu-items'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SettingsMenu from '~/routes/settings/settings-menu'
import React, { useState } from 'react'

const firstSettingsCategoryKey = SettingsMenuItems['root']?.children?.[0] as string

export default function Settings() {
  const [settingsCategory, setSettingsCategory] = useState<SettingsMenuItem>(
    SettingsMenuItems[firstSettingsCategoryKey as keyof SettingsMenuItem],
  )

  const setCategory = (category: string) => {
    const selectedCategory = SettingsMenuItems[category]
    if (selectedCategory) {
      setSettingsCategory(selectedCategory)
    }
  }

  const SettingsPage = settingsCategory?.data.content

  return (
    <SidebarLayout name="settings">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Settings" />
        <SettingsMenu selectedCategory={firstSettingsCategoryKey} onSelectedCategory={setCategory} />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="border-b-border flex h-12 grow items-center border-b px-4 bg-background">
            <div className="flex h-max items-end gap-4">
              <h1 className="text-xl font-medium">{settingsCategory?.data.title ?? 'Oops'}</h1>
              <p>{settingsCategory?.data.description ?? "Topic can't be retrieved"}</p>
            </div>
          </div>
        </div>
        {(SettingsPage && <SettingsPage />) || (
          <div>Something went wrong, please select a different category from the left sidebar.</div>
        )}
      </>
    </SidebarLayout>
  )
}
