import { NodeApi, type NodeRendererProps, Tree, TreeApi } from 'react-arborist'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { cities } from '~/routes/editor/cities'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import AltArrowRightIcon from '/icons/solar/Alt Arrow Right.svg?react'
import styles from './editor-files-tree.module.css'
import FolderIcon from '/icons/solar/Folder.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'

interface Data {
  id: string
  name: string
  children?: Data[]
}

const data = sortData(cities)
const INDENT_STEP = 15

export default function EditorFilesTree({}: Readonly<{}>) {
  const [tree, setTree] = useState<TreeApi<Data> | null | undefined>(null)
  const [active, setActive] = useState<Data | null>(null)
  const [focused, setFocused] = useState<Data | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [count, setCount] = useState(0)
  const [followsFocus, setFollowsFocus] = useState(false)
  const [disableMulti, setDisableMulti] = useState(false)

  useEffect(() => {
    setCount(tree?.visibleNodes.length ?? 0)
  }, [tree, searchTerm])

  return (
    <>
      <Tree
        width={'100%'}
        // height={}
        initialData={data}
        selectionFollowsFocus={followsFocus}
        disableMultiSelection={disableMulti}
        ref={(t) => setTree(t)}
        openByDefault={true}
        searchTerm={searchTerm}
        selection={active?.id}
        className={styles.tree}
        rowClassName={styles.row}
        padding={15}
        rowHeight={30}
        indent={INDENT_STEP}
        overscanCount={8}
        onSelect={(selected) => setSelectedCount(selected.length)}
        onActivate={(node) => setActive(node.data)}
        onFocus={(node) => setFocused(node.data)}
        onToggle={() => {
          setTimeout(() => {
            setCount(tree?.visibleNodes.length ?? 0)
          })
        }}
      >
        {Node}
      </Tree>
    </>
  )
}

function Node({ node, style, dragHandle }: Readonly<NodeRendererProps<Data>>) {
  const Icon = node.isInternal ? FolderIcon : CodeIcon
  const indentSize = Number.parseFloat(`${style.paddingLeft || 0}`)

  return (
    <div
      ref={dragHandle}
      style={style}
      className={clsx(styles.node, node.state)}
      onClick={() => node.isInternal && node.toggle()}
    >
      <div className={styles.indentLines}>
        {Array.from({ length: indentSize / INDENT_STEP })
          .fill(0)
          .map((_, index) => {
            return <div key={index}></div>
          })}
      </div>
      <FolderArrow node={node} />
      <Icon className={styles.icon} />{' '}
      <span className={styles.text}>{node.isEditing ? <Input node={node} /> : node.data.name}</span>
    </div>
  )
}

function Input({ node }: Readonly<{ node: NodeApi<Data> }>) {
  return (
    <input
      autoFocus
      name="name"
      type="text"
      defaultValue={node.data.name}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => node.reset()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') node.reset()
        if (event.key === 'Enter') node.submit(event.currentTarget.value)
      }}
    />
  )
}

function sortData(data: Data[]) {
  function sortIt(data: Data[]) {
    data.sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const d of data) {
      if (d.children) sortIt(d.children)
    }
    return data
  }
  return sortIt(data)
}

function FolderArrow({ node }: Readonly<{ node: NodeApi<Data> }>) {
  return (
    <span className={styles.arrow}>
      {node.isInternal &&
        (node.isOpen ? (
          <AltArrowDownIcon className={'fill-gray-400'} />
        ) : (
          <AltArrowRightIcon className={'fill-gray-400'} />
        ))}
    </span>
  )
}
