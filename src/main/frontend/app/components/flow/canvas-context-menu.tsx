import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useShortcutStore, type Platform } from '~/stores/shortcut-store'

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

function formatShortcut(shortcutId: string, platform: Platform): string | null {
  const shortcut = useShortcutStore.getState().shortcuts.get(shortcutId)
  if (!shortcut) return null

  const parts: string[] = []
  const mods = shortcut.modifiers ?? {}
  if (mods.cmdOrCtrl) parts.push(platform === 'mac' ? '⌘' : 'Ctrl')
  if (mods.shift) parts.push('Shift')
  if (mods.alt) parts.push(platform === 'mac' ? '⌥' : 'Alt')
  parts.push(shortcut.key.toUpperCase())
  return parts.join('+')
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
  const platform = useShortcutStore((s) => s.platform)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

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
        {shortcutId && (
          <span className="text-muted-foreground ml-4 text-xs">{formatShortcut(shortcutId, platform)}</span>
        )}
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
