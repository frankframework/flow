import { StaticTreeDataProvider, Tree, type TreeRef, UncontrolledTreeEnvironment } from 'react-complex-tree'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import { useRef } from 'react'
import helpTopics, { type HelpTopicTreeItem } from './help-topic-tree-items'
import '/styles/editor-files.css'
import { useNavigate } from 'react-router'

interface HelpCategoriesProperties {
  selectedTopic: keyof typeof helpTopics
}

const TREE_ID = 'help-topics-tree'

export default function HelpTopics({ selectedTopic }: Readonly<HelpCategoriesProperties>) {
  const navigate = useNavigate()
  const tree = useRef<TreeRef>(null)

  return (
    <div className="overflow-auto pr-2">
      <UncontrolledTreeEnvironment
        dataProvider={new StaticTreeDataProvider(helpTopics)}
        getItemTitle={(item: HelpTopicTreeItem): string => item.data.title}
        viewState={{ [TREE_ID]: { selectedItems: [selectedTopic] } }}
        disableMultiselect={true}
        onSelectItems={(items) => navigate(`/help/${items[0]}`)}
        canSearch={false}
        renderItemArrow={({ item, context }) => {
          if (!item.isFolder) {
            return null
          }
          const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
          return (
            <Icon
              onClick={context.toggleExpandedState}
              className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-gray-950"
            />
          )
        }}
        renderItemTitle={({ title }) => {
          return <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
        }}
      >
        <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
    </div>
  )
}
