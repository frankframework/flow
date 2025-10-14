import GettingStarted from '/docs/getting-started.mdx'
import AdvancedFeatures from '/docs/advanced-features.mdx'
import Troubleshooting from '/docs/troubleshooting.mdx'
import type { TreeItem } from 'react-complex-tree'
import React from 'react'

export type HelpTopicTreeItem = TreeItem<HelpTopicTreeItemData>

export interface HelpTopicTreeItemData {
  title: string
  description: string
  content?: React.FC
}

const items = {
  root: {
    index: 'root',
    children: ['gettingStarted', 'advancedFeatures', 'troubleshooting'],
    data: {
      title: '',
      description: '',
    },
  },
  gettingStarted: {
    index: 'gettingStarted',
    data: {
      title: 'Getting Started',
      description: 'Learning the basics',
      content: GettingStarted,
    },
  },
  advancedFeatures: {
    index: 'advancedFeatures',
    data: {
      title: 'Advanced Features',
      description: 'Learn about advanced features',
      content: AdvancedFeatures,
    },
  },
  troubleshooting: {
    index: 'troubleshooting',
    data: {
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      content: Troubleshooting,
    },
  },
} as Record<string, HelpTopicTreeItem>

export default items
