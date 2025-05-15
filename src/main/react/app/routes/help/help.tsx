import React from 'react'
import '/styles/markdown.css'
import helpTopicTreeItems, { type HelpTopicTreeItem } from './help-topic-tree-items'
import { useParams } from 'react-router'
import SidebarsContentClose from '~/components/sidebars/sidebars-content-close'
import { SidebarIndex } from '~/components/sidebars/sidebars-store'
import Sidebars from '~/components/sidebars/sidebars'
import SidebarsHeader from '~/components/sidebars/sidebars-header'
import HelpTopics from '~/routes/help/help-topics'

const SIDEBARS_ID = 'help'

const firstTopic = Object.keys(helpTopicTreeItems)[1]

export default function Help() {
  const { topic } = useParams<{ topic?: string }>()
  const helpTopicKey = topic ?? firstTopic
  const helpTopic: HelpTopicTreeItem | undefined = helpTopicTreeItems[helpTopicKey]

  const LeftSidebar = () => (
    <>
      <SidebarsHeader sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} title="Topics" />
      <HelpTopics selectedTopic={helpTopicKey} />
    </>
  )

  const Content = () => (
    <>
      <div className="flex">
        <SidebarsContentClose sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} />
        <div className="flex h-12 grow items-center border-b border-b-gray-200 px-4">
          <div className="flex h-max items-end gap-4">
            <h1 className="text-xl font-medium">{helpTopic?.data.title ?? 'Oops'}</h1>
            <p>{helpTopic?.data.description ?? "Topic can't be retrieved"}</p>
          </div>
        </div>
      </div>
      <div className="markdown-body h-full overflow-auto p-4">
        {React.createElement(
          helpTopic?.data.content ??
            (() => (
              <div>
                The topic with id: <code>{topic}</code> does not seem to exist, it might have been moved or deleted.
                Please select a different topic from the left sidebar.
              </div>
            )),
        )}
      </div>
    </>
  )

  return <Sidebars sidebarsId={SIDEBARS_ID} leftSidebar={LeftSidebar} content={Content} />
}
