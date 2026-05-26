import { useEffect, useRef } from 'react'
import { apiUrl } from '~/utils/api'

function useSseWatcher(url: string | null, onFileChange: () => void) {
  const callbackRef = useRef(onFileChange)
  callbackRef.current = onFileChange

  useEffect(() => {
    if (!url) return

    const eventSource = new EventSource(url)

    eventSource.addEventListener('file-change', () => {
      callbackRef.current()
    })

    return () => {
      eventSource.close()
    }
  }, [url])
}

export function useFileWatcher(projectName: string | null | undefined, onFileChange: () => void) {
  const url = projectName ? apiUrl(`/projects/${projectName}/watch`) : null
  useSseWatcher(url, onFileChange)
}

export function useDirectoryWatcher(path: string | null, onFileChange: () => void) {
  const url = path ? apiUrl(`/filesystem/watch?path=${encodeURIComponent(path)}`) : null
  useSseWatcher(url, onFileChange)
}
