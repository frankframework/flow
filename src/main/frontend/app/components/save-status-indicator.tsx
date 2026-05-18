import { useEffect, useState } from 'react'
import { useSaveStatusStore } from '~/stores/save-status-store'

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function SaveStatusIndicator() {
  const saveStatus = useSaveStatusStore((s) => s.saveStatus)
  const savedAt = useSaveStatusStore((s) => s.savedAt)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!savedAt || saveStatus !== 'saved') return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [savedAt, saveStatus])

  if (saveStatus === 'saving') return <span className="text-foreground-muted text-xs">☁️ Saving...</span>
  if (saveStatus === 'saved' && savedAt)
    return <span className="text-foreground-muted text-xs">☁️ Saved {getTimeAgo(savedAt)}</span>
  return null
}
