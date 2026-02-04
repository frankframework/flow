import CodeIcon from '../../../icons/solar/Code.svg?react'
import JavaIcon from '../../../icons/solar/Cup Hot.svg?react'
import MessageIcon from '../../../icons/solar/Chat Dots.svg?react'
import MailIcon from '../../../icons/solar/Mailbox.svg?react'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import type { FileTreeNode } from './editor-data-provider'

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

export function sortChildren(children?: FileTreeNode[]): FileTreeNode[] {
  // Sort directories first, then XML files (Treated like folders), then other files, all alphabetically
  return (children ?? []).toSorted((a, b) => {
    const diff = getSortRank(a) - getSortRank(b)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })
}
