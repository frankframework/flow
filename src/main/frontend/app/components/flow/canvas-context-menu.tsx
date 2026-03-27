import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuDismiss } from '~/hooks/use-context-menu-dismiss'
import { useShortcutStore, formatShortcutParts } from '~/stores/shortcut-store'

interface CanvasContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onAddNote: () => void
  onGroup: () => void
  onUngroup: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  hasSelection: boolean
  hasGroupedSelection: boolean
  hasClipboard: boolean
}

function formatShortcut(shortcutId: string): string | null {
  const { shortcuts, platform } = useShortcutStore.getState()
  const shortcut = shortcuts.get(shortcutId)
  if (!shortcut) return null
  return formatShortcutParts(shortcut, platform).join('+')
}

export default function CanvasContextMenu({
  position,
  onClose,
  onAddNote,
  onGroup,
  onUngroup,
  onCut,
  onCopy,
  onPaste,
  hasSelection,
  hasGroupedSelection,
  hasClipboard,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  useContextMenuDismiss(menuRef, onClose)

  const itemClass = 'flex items-center justify-between gap-6 px-3 py-1.5 text-sm whitespace-nowrap'
  const enabledClass = `${itemClass} cursor-pointer hover:bg-hover text-foreground`
  const disabledClass = `${itemClass} cursor-default text-muted-foreground opacity-50`

  function menuItem(label: string, onClick: () => void, enabled: boolean, shortcutId?: string) {
    return (
      <div
        className={enabled ? enabledClass : disabledClass}
        onClick={
          enabled
            ? () => {
                onClick()
                onClose()
              }
            : undefined
        }
      >
        <span>{label}</span>
        {shortcutId && <span className="text-muted-foreground ml-4 text-xs">{formatShortcut(shortcutId)}</span>}
      </div>
    )
  }

  return createPortal(
    <div
      ref={menuRef}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {menuItem('Add Note', onAddNote, true)}
      <div className="bg-border my-1 h-px" />
      {menuItem('Group', onGroup, hasSelection, 'studio.group')}
      {menuItem('Ungroup', onUngroup, hasGroupedSelection, 'studio.ungroup')}
      <div className="bg-border my-1 h-px" />
      {menuItem('Cut', onCut, hasSelection, 'studio.cut')}
      {menuItem('Copy', onCopy, hasSelection, 'studio.copy')}
      {menuItem('Paste', onPaste, hasClipboard, 'studio.paste')}
    </div>,
    document.body,
  )
}
