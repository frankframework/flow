import type { FunctionComponent, SVGProps } from 'react'
import CodeIcon from '../../../icons/solar/Code.svg?react'
import JavaIcon from '../../../icons/solar/Cup Hot.svg?react'
import MessageIcon from '../../../icons/solar/Chat Dots.svg?react'
import MailIcon from '../../../icons/solar/Mailbox.svg?react'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import type { FileTreeNode } from '~/types/filesystem.types'
import type { TreeRef } from 'react-complex-tree'
import { relativeTo } from '~/utils/path-utils'

export function getListenerIcon(
  listenerType: string | null,
): FunctionComponent<SVGProps<SVGSVGElement> & { title?: string; titleId?: string; desc?: string; descId?: string }> {
  if (!listenerType) return CodeIcon

  const listenerIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    JavaListener: JavaIcon,
    MessageStoreListener: MessageIcon,
    FtpFileSystemListener: FolderIcon,
    ExchangeMailListener: MailIcon,
  }

  return listenerIconMap[listenerType] ?? CodeIcon
}

function getSortRank(child: FileTreeNode): 0 | 1 | 2 {
  if (child.type === 'DIRECTORY') return 0
  if (child.type === 'FILE' && child.name.endsWith('.xml')) return 1
  return 2
}

export function getAncestorIds(itemId: string): string[] {
  const parts = itemId.split('/')
  return parts.slice(0, -1).map((_, index): string => parts.slice(0, index + 1).join('/'))
}

export function toTreeItemId(absolutePath: string, rootPath: string): string {
  const relativePath = relativeTo(rootPath, absolutePath)
  return relativePath ? `root/${relativePath}` : 'root'
}

export function isVisibleInTree(itemId: string | null, expandedItems: string[]): boolean {
  if (!itemId) return false
  return getAncestorIds(itemId)
    .slice(1)
    .every((id): boolean => expandedItems.includes(id))
}

export function selectAndReveal(treeReference: TreeRef, itemId: string): void {
  setTimeout((): void => {
    treeReference.selectItems([itemId])
    treeReference.focusItem(itemId)
  }, 50)
}

export function sortChildren(children?: FileTreeNode[]): FileTreeNode[] {
  return (children ?? []).toSorted((a, b): number => {
    const diff = getSortRank(a) - getSortRank(b)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })
}
