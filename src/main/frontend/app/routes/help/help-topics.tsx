import {
  StaticTreeDataProvider,
  Tree,
  type TreeItemIndex,
  type TreeItemRenderContext,
  type TreeRef,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import { type JSX, useRef } from 'react'
import { useNavigate } from 'react-router'
import helpTopics, { type HelpTopicTreeItem } from './help-topic-tree-items'
import '/styles/editor-files.css'

type HelpCategoriesProperties = {
  selectedTopic: keyof typeof helpTopics
}

const TREE_ID = 'help-topics-tree'

export default function HelpTopics({ selectedTopic }: Readonly<HelpCategoriesProperties>): JSX.Element {
  const navigate = useNavigate()
  const tree = useRef<TreeRef>(null)

  const navigateToTopic = (items: TreeItemIndex[]): void | Promise<void> => navigate(`/help/${items[0]}`)

  const renderItemArrow = ({
    item,
    context,
  }: {
    item: HelpTopicTreeItem
    context: TreeItemRenderContext
  }): JSX.Element | null => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
    return (
      <Icon
        onClick={context.toggleExpandedState}
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground"
      />
    )
  }

  const renderItemTitle = ({ title }: { title: string }): JSX.Element => (
    <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
  )

  return (
    <>
      <div className="overflow-auto px-2">
        <UncontrolledTreeEnvironment
          dataProvider={new StaticTreeDataProvider(helpTopics)}
          getItemTitle={({ data }): string => data.title}
          viewState={{ [TREE_ID]: { selectedItems: [selectedTopic] } }}
          disableMultiselect={true}
          onSelectItems={navigateToTopic}
          canSearch={false}
          renderItemArrow={renderItemArrow}
          renderItemTitle={renderItemTitle}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Help Topics" />
        </UncontrolledTreeEnvironment>
      </div>
    </>
  )
}
