import {
  Tree,
  type TreeItem,
  type TreeItemRenderContext,
  type TreeRef,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree'
import '/styles/editor-files.css'
import FolderIcon from '/icons/solar/Folder.svg?react'
import FolderOpenIcon from '/icons/solar/Folder Open.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import React, { type RefObject, useRef } from 'react'
import EditorFilesDataProvider from '~/routes/editor/editor-files-data-provider'
import Search from '~/components/search/search'

const TREE_ID = 'editor-files-tree'

interface EditorFilesTreeProperties {
  search?: string
  ref?: RefObject<unknown>
}

export default function EditorFiles({}: Readonly<EditorFilesTreeProperties>) {
  const tree = useRef<TreeRef>(null)
  const [autoFocus, setAutoFocus] = React.useState(false)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    tree.current?.setSearch(event.target.value)
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focus = event.key === 'Enter'
    setAutoFocus(focus)
    tree.current?.focusTree(focus)
  }

  const renderItemArrow = ({ item, context }: { item: TreeItem<unknown>; context: TreeItemRenderContext }) => {
    if (!item.isFolder) {
      return null
    }
    const Icon = context.isExpanded ? AltArrowDownIcon : AltArrowRightIcon
    return (
      <Icon
        onClick={context.toggleExpandedState}
        className="rct-tree-item-arrow-isFolder rct-tree-item-arrow fill-foreground"
      />
    )
  }

  const renderItemTitle = ({
    title,
    item,
    context,
  }: {
    title: string
    item: TreeItem<unknown>
    context: TreeItemRenderContext
  }) => {
    const Icon = (item.isFolder && (context.isExpanded ? FolderOpenIcon : FolderIcon)) || CodeIcon
    return (
      <>
        <Icon className="fill-foreground w-4 flex-shrink-0" />
        <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
      </>
    )
  }

  return (
    <>
      <Search onChange={handleInputChange} onKeyDown={handleKeyPress}></Search>
      <div className="overflow-auto pr-2">
        <UncontrolledTreeEnvironment
          dataProvider={new EditorFilesDataProvider()}
          getItemTitle={(item) => item.data}
          viewState={{}}
          canDragAndDrop={true}
          canDropOnFolder={true}
          canSearch={false}
          autoFocus={autoFocus}
          renderItemArrow={renderItemArrow}
          renderItemTitle={renderItemTitle}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Editor Files" />
        </UncontrolledTreeEnvironment>
      </div>
    </>
  )
}
