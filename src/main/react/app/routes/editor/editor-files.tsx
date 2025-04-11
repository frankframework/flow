import { Tree, type TreeRef, UncontrolledTreeEnvironment } from 'react-complex-tree'
import './editor-files.css'
import FolderIcon from '/icons/solar/Folder.svg?react'
import FolderOpenIcon from '/icons/solar/Folder Open.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import React, { type RefObject, useRef } from 'react'
import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import CustomDataProviderImplementation from '~/routes/editor/editor-files-data-provider'

const TREE_ID = 'editor-files-tree'

interface EditorFilesTreeProperties {
  search?: string
  ref?: RefObject<unknown>
  onClose: () => void
}

export default function EditorFiles({ onClose }: Readonly<EditorFilesTreeProperties>) {
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-1 px-4">
        <SidebarIcon
          onClick={onClose}
          className="rotate-180 fill-gray-950 hover:fill-[var(--color-brand)]"
        ></SidebarIcon>
        <div className="text-xl">Files</div>
      </div>
      <div className="relative px-4">
        <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
          <MagnifierIcon className="h-auto w-4 fill-gray-400" />
        </label>
        <input
          id="search"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-1 pr-4 pl-7"
          type="search"
          placeholder="Search"
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
        />
      </div>

      <div className="overflow-auto pr-2">
        <UncontrolledTreeEnvironment
          dataProvider={new CustomDataProviderImplementation()}
          getItemTitle={(item) => item.data}
          viewState={{}}
          canDragAndDrop={true}
          canDropOnFolder={true}
          canSearch={false}
          autoFocus={autoFocus}
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
          renderItemTitle={({ title, item, context }) => {
            const Icon = item.isFolder ? (context.isExpanded ? FolderOpenIcon : FolderIcon) : CodeIcon
            return (
              <>
                <Icon className="w-4 flex-shrink-0 fill-gray-950" />
                <span className="font-inter ml-1 overflow-hidden text-nowrap text-ellipsis">{title}</span>
              </>
            )
          }}
        >
          <Tree treeId={TREE_ID} rootItem="root" ref={tree} treeLabel="Tree Example" />
        </UncontrolledTreeEnvironment>
      </div>
    </div>
  )
}
