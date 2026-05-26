import CodeIcon from '../../../icons/solar/Code.svg?react'
import JavaIcon from '../../../icons/solar/Cup Hot.svg?react'
import MessageIcon from '../../../icons/solar/Chat Dots.svg?react'
import MailIcon from '../../../icons/solar/Mailbox.svg?react'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import type { FileTreeNode } from '~/types/filesystem.types'
import type { TreeRef } from 'react-complex-tree'

export function getListenerIcon(listenerType: string | null) {
  if (!listenerType) return CodeIcon

  const listenerIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    JavaListener: JavaIcon,
    MessageStoreListener: MessageIcon,
    FtpFileSystemListener: FolderIcon,
    ExchangeMailListener: MailIcon,
  }

  return listenerIconMap[listenerType] ?? CodeIcon
}

function getSortRank(child: FileTreeNode) {
  if (child.type === 'DIRECTORY') return 0
  if (child.type === 'FILE' && child.name.endsWith('.xml')) return 1
  return 2
}

export function getAncestorIds(itemId: string): string[] {
  const parts = itemId.split('/')
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
}

export function toTreeItemId(absolutePath: string, rootPath: string): string {
  const relativePath = absolutePath.slice(rootPath.length).replace(/^[/\\]/, '')
  return `root/${relativePath.split(/[/\\]/).join('/')}`
}

export function isVisibleInTree(itemId: string | null, expandedItems: string[]): boolean {
  if (!itemId) return false
  return getAncestorIds(itemId)
    .slice(1)
    .every((id) => expandedItems.includes(id))
}

export function selectAndReveal(treeRef: TreeRef, itemId: string): void {
  setTimeout(() => {
    treeRef.selectItems([itemId])
    treeRef.focusItem(itemId)
  }, 50)
}

export function sortChildren(children?: FileTreeNode[]): FileTreeNode[] {
  return (children ?? []).toSorted((a, b) => {
    const diff = getSortRank(a) - getSortRank(b)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })
}
