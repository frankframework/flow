import { apiFetch } from '~/utils/api'
import type { GitStatus, GitFileDiff, GitCommitResult, GitPushResult, GitPullResult } from '~/types/git.types'
import useEditorTabStore from '~/stores/editor-tab-store'
import { useGitStore } from '~/stores/git-store'

function gitUrl(projectName: string, path: string): string {
  return `/projects/${encodeURIComponent(projectName)}/git${path}`
}

export async function fetchGitStatus(projectName: string): Promise<GitStatus> {
  return apiFetch<GitStatus>(gitUrl(projectName, '/status'))
}

export async function fetchFileDiff(projectName: string, filePath: string): Promise<GitFileDiff> {
  return apiFetch<GitFileDiff>(gitUrl(projectName, `/diff?file=${encodeURIComponent(filePath)}`))
}

export function stageFile(projectName: string, filePath: string): Promise<void> {
  return apiFetch(gitUrl(projectName, '/stage'), {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  })
}

export function stageHunks(projectName: string, filePath: string, hunkIndices: number[]): Promise<void> {
  return apiFetch(gitUrl(projectName, '/stage-hunks'), {
    method: 'POST',
    body: JSON.stringify({ filePath, hunkIndices }),
  })
}

export async function commitChanges(projectName: string, message: string): Promise<GitCommitResult> {
  return apiFetch<GitCommitResult>(gitUrl(projectName, '/commit'), {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function pushChanges(projectName: string, token?: string): Promise<GitPushResult> {
  return apiFetch<GitPushResult>(gitUrl(projectName, '/push'), {
    method: 'POST',
    body: token ? JSON.stringify({ token }) : undefined,
  })
}

export async function pullChanges(projectName: string, token?: string): Promise<GitPullResult> {
  return apiFetch<GitPullResult>(gitUrl(projectName, '/pull'), {
    method: 'POST',
    body: token ? JSON.stringify({ token }) : undefined,
  })
}

/** Refreshes git status and all open diff tabs. Call after save, commit, or pull. */
export async function refreshOpenDiffs(projectName: string): Promise<void> {
  const tabStore = useEditorTabStore.getState()
  const gitStore = useGitStore.getState()

  try {
    const newStatus = await fetchGitStatus(projectName)
    gitStore.setStatus(newStatus)
  } catch {
    /* ignore */
  }

  for (const [tabId, tab] of Object.entries(tabStore.tabs)) {
    if (tab.type === 'diff' && tab.diffData) {
      try {
        const diff = await fetchFileDiff(projectName, tab.diffData.filePath)
        tabStore.setTabData(tabId, {
          ...tab,
          diffData: {
            oldContent: diff.oldContent,
            newContent: diff.newContent,
            filePath: diff.filePath,
            hunks: diff.hunks,
          },
        })
        gitStore.initFileHunks(tab.diffData.filePath, diff.hunks.length)
      } catch {
        /* ignore - file may no longer have changes */
      }
    }
  }
}
