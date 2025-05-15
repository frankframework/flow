import '/styles/markdown.css'
import helpTopicTreeItems, { type HelpTopicTreeItem } from './help-topic-tree-items'
import { useParams } from 'react-router'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import HelpTopics from '~/routes/help/help-topics'

const firstTopic = Object.keys(helpTopicTreeItems)[1]

export default function Help() {
  const { topic } = useParams<{ topic?: string }>()
  const helpTopicKey = topic ?? firstTopic
  const helpTopic: HelpTopicTreeItem | undefined = helpTopicTreeItems[helpTopicKey]

  const MarkdownContent = helpTopic?.data.content

  return (
    <SidebarLayout name="help">
      <SidebarLayout.Left>
        <SidebarHeader side={SidebarSide.LEFT} title="Topics" />
        <HelpTopics selectedTopic={helpTopicKey} />
      </SidebarLayout.Left>
      <SidebarLayout.Content>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="flex h-12 grow items-center border-b border-b-gray-200 px-4">
            <div className="flex h-max items-end gap-4">
              <h1 className="text-xl font-medium">{helpTopic?.data.title ?? 'Oops'}</h1>
              <p>{helpTopic?.data.description ?? "Topic can't be retrieved"}</p>
            </div>
          </div>
        </div>
        <div className="markdown-body h-full overflow-auto p-4">
          {(MarkdownContent && <MarkdownContent />) || (
            <div>
              The topic with id: <code>{topic}</code> does not seem to exist, it might have been moved or deleted.
              Please select a different topic from the left sidebar.
            </div>
          )}
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  )
}
