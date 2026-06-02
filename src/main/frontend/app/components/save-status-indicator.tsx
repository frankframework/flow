import { useEffect, useState } from 'react'
import { useSaveStatusStore } from '~/stores/save-status-store'
import CloudIcon from '/icons/solar/Cloud.svg?react'

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function SaveStatusIndicator() {
  const saveStatus = useSaveStatusStore((state) => state.saveStatus)
  const savedAt = useSaveStatusStore((state) => state.savedAt)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!savedAt || saveStatus !== 'saved') return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
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
