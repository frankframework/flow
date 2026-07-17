import { useEffect, useRef } from 'react'
import { apiUrl } from '~/utils/api'

type WatcherEntry = {
  source: EventSource
  handlers: Set<() => void>
  closeTimer: ReturnType<typeof setTimeout> | null
}

const watchers = new Map<string, WatcherEntry>()

function useSseWatcher(url: string | null, onFileChange?: () => void) {
  const callbackReference = useRef(onFileChange)
  callbackReference.current = onFileChange

  useEffect(() => {
    if (!url) return

    let entry = watchers.get(url)

    if (entry) {
      if (entry.closeTimer !== null) {
        clearTimeout(entry.closeTimer)
        entry.closeTimer = null
      }
    } else {
      const source = new EventSource(url)
      entry = { source, handlers: new Set(), closeTimer: null }
      watchers.set(url, entry)
    }

    const handler = () => callbackReference.current?.()
    entry.handlers.add(handler)
    entry.source.addEventListener('file-change', handler)

    const currentEntry = entry

    return () => {
      currentEntry.source.removeEventListener('file-change', handler)
      currentEntry.handlers.delete(handler)

      if (currentEntry.handlers.size === 0) {
        currentEntry.closeTimer = setTimeout(() => {
          currentEntry.source.close()
          watchers.delete(url)
        }, 100)
      }
    }
  }, [url])
}

export function useFileWatcher(projectName: string | null | undefined, onFileChange?: () => void) {
  const url = projectName ? apiUrl(`/projects/${projectName}/watch`) : null
  useSseWatcher(url, onFileChange)
}

export function useDirectoryWatcher(path: string | null, onFileChange: () => void) {
  const url = path ? apiUrl(`/filesystem/watch?path=${encodeURIComponent(path)}`) : null
  useSseWatcher(url, onFileChange)
}
