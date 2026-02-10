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
import { useRef } from 'react'
import helpTopics, { type HelpTopicTreeItem } from './help-topic-tree-items'
import '/styles/editor-files.css'
import { useNavigationStore } from '~/stores/navigation-store'

interface HelpCategoriesProperties {
  selectedTopic: keyof typeof helpTopics
}

const TREE_ID = 'help-topics-tree'

export default function HelpTopics({ selectedTopic }: Readonly<HelpCategoriesProperties>) {
  const navigate = useNavigationStore((state) => state.navigate)
  const tree = useRef<TreeRef>(null)

  const navigateToTopic = (items: TreeItemIndex[]) => navigate('help', { topic: String(items[0]) })

  const renderItemArrow = ({ item, context }: { item: HelpTopicTreeItem; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
    return (
      <Icon
        onClick={context.toggleExpandedState}
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground"
      />
    )
  }

  const renderItemTitle = ({ title }: { title: string }) => (
    <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
  )

  return (
    <>
      <div className="overflow-auto px-2">
        <UncontrolledTreeEnvironment
          dataProvider={new StaticTreeDataProvider(helpTopics)}
          getItemTitle={({ data }) => data.title}
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
