import { useCallback, useEffect } from 'react'
import { useGitStore } from '~/stores/git-store'
import {
  fetchGitStatus,
  fetchFileDiff,
  stageFile,
  stageHunks,
  commitChanges,
  pushChanges,
  pullChanges,
} from '~/services/git-service'
import { showErrorToastFrom, showInfoToast, showSuccessToast, showErrorToast } from '~/components/toast'
import useEditorTabStore from '~/stores/editor-tab-store'
import GitToolbar from './git-toolbar'
import GitChanges from './git-changes'
import GitCommitBox from './git-commit-box'

interface GitPanelProps {
  projectName: string
}

export default function GitPanel({ projectName }: GitPanelProps) {
  const {
    status,
    selectedFile,
    fileHunkStates,
    commitMessage,
    isLoading,
    token,
    setStatus,
    setSelectedFile,
    setFileDiff,
    initFileHunks,
    selectAllFileHunks,
    clearFileHunks,
    setCommitMessage,
    setIsLoading,
    setToken,
  } = useGitStore()

  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await fetchGitStatus(projectName)
      setStatus(newStatus)
    } catch (error) {
      showErrorToastFrom('Failed to fetch git status', error)
    }
  }, [projectName, setStatus])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleSelectFile = useCallback(
    async (file: string) => {
      setSelectedFile(file)
      try {
        const diff = await fetchFileDiff(projectName, file)
        setFileDiff(diff)
        initFileHunks(file, diff.hunks.length)

        const tabId = `diff:${file}`
        const fileName = file.split('/').pop() || file
        const editorTabStore = useEditorTabStore.getState()
        editorTabStore.setTabData(tabId, {
          name: `${fileName} (diff)`,
          configurationPath: file,
          type: 'diff',
          diffData: {
            oldContent: diff.oldContent,
            newContent: diff.newContent,
            filePath: diff.filePath,
            hunks: diff.hunks,
          },
        })
        editorTabStore.setActiveTab(tabId)
      } catch (error) {
        showErrorToastFrom('Failed to load diff', error)
      }
    },
    [projectName, setSelectedFile, setFileDiff, initFileHunks],
  )

  const handleToggleFile = useCallback(
    (filePath: string) => {
      const hunkState = useGitStore.getState().fileHunkStates[filePath]
      if (!hunkState || hunkState.totalHunks === 0) {
        handleSelectFile(filePath)
        return
      }
      if (hunkState.selectedHunks.size === hunkState.totalHunks) {
        clearFileHunks(filePath)
      } else {
        selectAllFileHunks(filePath)
      }
    },
    [handleSelectFile, clearFileHunks, selectAllFileHunks],
  )

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return
    setIsLoading(true)
    try {
      const allHunkStates = useGitStore.getState().fileHunkStates

      for (const [filePath, hunkState] of Object.entries(allHunkStates)) {
        if (hunkState.selectedHunks.size === 0) continue
        await (hunkState.selectedHunks.size === hunkState.totalHunks
          ? stageFile(projectName, filePath)
          : stageHunks(projectName, filePath, [...hunkState.selectedHunks]))
      }

      const result = await commitChanges(projectName, commitMessage)
      setCommitMessage('')

      for (const filePath of Object.keys(allHunkStates)) {
        clearFileHunks(filePath)
      }

      await refreshStatus()
      showSuccessToast(`Committed: ${result.commitId.slice(0, 7)}`)
    } catch (error) {
      showErrorToastFrom('Failed to commit', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectName, commitMessage, setIsLoading, setCommitMessage, refreshStatus, clearFileHunks])

  const handlePush = useCallback(async () => {
    if ((status?.ahead ?? 0) === 0) {
      showInfoToast('Nothing to push')
      return
    }
    try {
      const result = await pushChanges(projectName, token || undefined)
      if (result.success) {
        showSuccessToast(result.message)
      } else {
        showErrorToast(result.message)
      }
      await refreshStatus()
    } catch (error) {
      showErrorToastFrom('Failed to push', error)
    }
  }, [projectName, token, refreshStatus, status?.ahead])

  const handlePull = useCallback(async () => {
    try {
      const result = await pullChanges(projectName, token || undefined)
      if (result.success) {
        const isUpToDate = result.message?.toLowerCase().includes('up to date')
        if (isUpToDate) {
          showInfoToast(result.message)
        } else {
          showSuccessToast(result.message)
        }
      } else {
        showErrorToast(result.message)
      }
      await refreshStatus()
    } catch (error) {
      showErrorToastFrom('Failed to pull', error)
    }
  }, [projectName, token, refreshStatus])

  const hasSelectedChunks = Object.values(fileHunkStates).some((s) => s.selectedHunks.size > 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <GitToolbar
        status={status}
        onRefresh={refreshStatus}
        onPush={handlePush}
        onPull={handlePull}
        token={token}
        onTokenChange={setToken}
      />
      <GitChanges
        status={status}
        selectedFile={selectedFile}
        fileHunkStates={fileHunkStates}
        onSelectFile={handleSelectFile}
        onToggleFile={handleToggleFile}
      />
      <GitCommitBox
        commitMessage={commitMessage}
        onMessageChange={setCommitMessage}
        onCommit={handleCommit}
        hasSelectedChunks={hasSelectedChunks}
        isLoading={isLoading}
      />
    </div>
  )
}
