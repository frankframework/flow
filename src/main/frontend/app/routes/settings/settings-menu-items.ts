import type { TreeItem } from 'react-complex-tree'
import React from 'react'
import WidgetIcon from '/icons/solar/Widget.svg?react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import GeneralSettings from '~/routes/settings/pages/general-settings'
import StudioSettings from '~/routes/settings/pages/studio-settings'
import ProjectSettings from './pages/project-settings'

export type SettingsMenuItem = TreeItem<SettingsMenuItemData>

export interface SettingsMenuItemData {
  title: string
  description: string
  icon?: React.FC
  content?: React.FC
}

//todo: add editor settings and icon after there are settings to add there

const SettingsMenuItems = {
  root: {
    index: 'root',
    children: ['general', 'projects', 'studio'],
    data: {
      title: '',
      description: '',
    },
  },
  general: {
    index: 'general',
    data: {
      title: 'General',
      description: 'General settings',
      content: GeneralSettings,
    },
  },
  projects: {
    index: 'projects',
    data: {
      title: 'Projects',
      description: 'Project settings',
      icon: WidgetIcon,
      content: ProjectSettings,
    },
  },
  studio: {
    index: 'studio',
    data: {
      title: 'Studio',
      description: 'Studio settings',
      icon: RulerCrossPenIcon,
      content: StudioSettings,
    },
  },
  /*
   *editor: {
   *index: 'editor',
   *data: {
   *  title: 'Editor',
   *  description: 'Editor settings',
   *  icon: CodeIcon,
   *},
   *},
   */
} as Record<string, SettingsMenuItem>

export default SettingsMenuItems
