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
import settingsCategories, { type SettingsMenuItem } from './settings-menu-items'
import '/styles/editor-files.css'
import SettingsIcon from '/icons/solar/Settings.svg?react'
import helpTopics from '~/routes/help/help-topic-tree-items'

interface SettingsMenuProperties {
  selectedCategory: keyof typeof settingsCategories
  onSelectedCategory: (category: keyof typeof settingsCategories) => void
}

const TREE_ID = 'settings-menu-tree'

export default function SettingsMenu({ selectedCategory, onSelectedCategory }: Readonly<SettingsMenuProperties>) {
  const tree = useRef<TreeRef>(null)

  const onSelectItemsHandler = (items: TreeItemIndex[]) =>
    onSelectedCategory(items[0] as keyof typeof settingsCategories)

  const renderItemArrow = ({ item, context }: { item: SettingsMenuItem; context: TreeItemRenderContext }) => {
    if (!item.isFolder) return null

    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
    return (
      <Icon
        onClick={context.toggleExpandedState}
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground"
      />
    )
  }

  const renderItemTitle = ({ title, item }: { title: string; item: SettingsMenuItem }) => {
    const Icon = item.data.icon || SettingsIcon
    return (
      <>
        {Icon && <Icon className="w-4 flex-shrink-0 fill-foreground" />}
        <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
      </>
    )
  }

  return (
    <>
      <div className="overflow-auto px-2">
        <UncontrolledTreeEnvironment
          dataProvider={new StaticTreeDataProvider(settingsCategories)}
          getItemTitle={({ data }) => data.title}
          viewState={{ [TREE_ID]: { selectedItems: [selectedCategory] } }}
          disableMultiselect={true}
          onSelectItems={onSelectItemsHandler}
          canSearch={false}
          renderItemArrow={renderItemArrow}
          renderItemTitle={renderItemTitle}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Settings Menu" />
        </UncontrolledTreeEnvironment>
      </div>
    </>
  )
}
