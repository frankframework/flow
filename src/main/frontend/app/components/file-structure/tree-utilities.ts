import CodeIcon from '../../../icons/solar/Code.svg?react'
import JavaIcon from '../../../icons/solar/Cup Hot.svg?react'
import MessageIcon from '../../../icons/solar/Chat Dots.svg?react'
import MailIcon from '../../../icons/solar/Mailbox.svg?react'
import FolderIcon from '../../../icons/solar/Folder.svg?react'

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
