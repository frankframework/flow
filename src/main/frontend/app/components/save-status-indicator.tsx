import { type JSX, useEffect, useState } from 'react'
import { type SaveStatus, useSaveStatusStore } from '~/stores/save-status-store'
import CloudIcon from '/icons/solar/Cloud.svg?react'

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function SaveStatusIndicator(): JSX.Element | null {
  const saveStatus = useSaveStatusStore((state): SaveStatus => state.saveStatus)
  const savedAt = useSaveStatusStore((state): Date | null => state.savedAt)
  const [, setTick] = useState(0)

  useEffect((): (() => void) | undefined => {
    if (!savedAt || saveStatus !== 'saved') return
    const id = setInterval((): void => setTick((t): number => t + 1), 30_000)
    return (): void => clearInterval(id)
  }, [savedAt, saveStatus])

  if (saveStatus === 'saving') {
    return (
      <span className="text-foreground-muted inline-flex items-center gap-1.5 text-xs">
        <CloudIcon />
        Saving...
      </span>
    )
  }

  if (saveStatus === 'saved' && savedAt) {
    return (
      <span className="text-foreground-muted inline-flex items-center gap-1.5 text-xs">
        <CloudIcon />
        Saved {getTimeAgo(savedAt)}
      </span>
    )
  }

  return null
}
