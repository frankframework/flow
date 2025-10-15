import '/styles/markdown.css'
import HelpTopicTreeItems, { type HelpTopicTreeItem } from './help-topic-tree-items'
import { useParams } from 'react-router'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import HelpTopics from '~/routes/help/help-topics'

const firstTopic = HelpTopicTreeItems['root']?.children?.[0] as string

export default function Help() {
  const { topic } = useParams<{ topic?: string }>()
  const helpTopicKey = topic ?? firstTopic
  const helpTopic: HelpTopicTreeItem | undefined = HelpTopicTreeItems[helpTopicKey]

  const MarkdownContent = helpTopic?.data.content

  return (
    <SidebarLayout name="help">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Topics" />
        <HelpTopics selectedTopic={helpTopicKey} />
      </>
      <>
        <div className="bg-background flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="border-b-border flex h-12 grow items-center border-b px-4">
            <div className="flex h-max items-end gap-4">
              <h1 className="text-xl font-medium">{helpTopic?.data.title ?? 'Oops'}</h1>
              <p>{helpTopic?.data.description ?? "Topic can't be retrieved"}</p>
            </div>
          </div>
        </div>
        <div className="markdown-body h-full overflow-auto p-6">
          <div className="border-border bg-background rounded-md border p-6">
            {(MarkdownContent && <MarkdownContent />) || (
              <div>
                The topic with id: <code>{topic}</code> does not seem to exist, it might have been moved or deleted.
                Please select a different topic from the left sidebar.
              </div>
            )}
          </div>
        </div>
      </>
    </SidebarLayout>
  )
}
