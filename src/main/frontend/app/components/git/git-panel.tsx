import { type JSX, useCallback, useEffect } from 'react'
import useToasts from '~/components/toast/use-toasts'
import { useGitStore } from '~/stores/git-store'
import {
  fetchGitStatus,
  fetchFileDiff,
  stageFile,
  stageHunks,
  commitChanges,
  pushChanges,
  pullChanges,
  refreshOpenDiffs,
} from '~/services/git-service'
import useEditorTabStore from '~/stores/editor-tab-store'
import { logApiError } from '~/utils/logger'
import GitToolbar from './git-toolbar'
import GitChanges from './git-changes'
import GitCommitBox from './git-commit-box'

type GitPanelProperties = {
  projectName: string
  hasStoredToken: boolean
}

export default function GitPanel({ projectName, hasStoredToken }: GitPanelProperties): JSX.Element {
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
  const { showSuccessToast, showInfoToast, showErrorToast } = useToasts()

  const refreshStatus = useCallback(
    async (showToast = false): Promise<void> => {
      try {
        const newStatus = await fetchGitStatus(projectName)
        setStatus(newStatus)
        if (showToast) showInfoToast('Status refreshed')
      } catch (error) {
        logApiError('Failed to fetch git status', error as Error)
        if (showToast) showErrorToast('Failed to refresh status')
      }
    },
    [projectName, setStatus, showErrorToast, showInfoToast],
  )

  useEffect((): void => {
    refreshStatus()
  }, [refreshStatus])

  const handleSelectFile = useCallback(
    async (file: string): Promise<void> => {
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
        logApiError('Failed to load diff', error as Error)
      }
    },
    [projectName, setSelectedFile, setFileDiff, initFileHunks],
  )

  const handleToggleFile = useCallback(
    async (filePath: string): Promise<void> => {
      const hunkState = useGitStore.getState().fileHunkStates[filePath]
      if (!hunkState) {
        await handleSelectFile(filePath)
      }

      const updatedState = useGitStore.getState().fileHunkStates[filePath]

      if (!updatedState) {
        initFileHunks(filePath, 0)
        selectAllFileHunks(filePath)
        return
      }

      if (updatedState.totalHunks === 0) {
        if (updatedState.selected) {
          clearFileHunks(filePath)
        } else {
          selectAllFileHunks(filePath)
        }
        return
      }

      if (updatedState.selectedHunks.size === updatedState.totalHunks) {
        clearFileHunks(filePath)
      } else {
        selectAllFileHunks(filePath)
      }
    },
    [handleSelectFile, initFileHunks, clearFileHunks, selectAllFileHunks],
  )

  const handleCommit = useCallback(async (): Promise<void> => {
    if (!commitMessage.trim()) return
    setIsLoading(true)
    try {
      const allHunkStates = useGitStore.getState().fileHunkStates

      for (const [filePath, hunkState] of Object.entries(allHunkStates)) {
        const isZeroHunkSelected = hunkState.totalHunks === 0 && hunkState.selected

        if (!isZeroHunkSelected && hunkState.selectedHunks.size === 0) continue

        await (isZeroHunkSelected || hunkState.selectedHunks.size === hunkState.totalHunks
          ? stageFile(projectName, filePath)
          : stageHunks(projectName, filePath, [...hunkState.selectedHunks]))
      }

      const result = await commitChanges(projectName, commitMessage)
      setCommitMessage('')

      for (const filePath of Object.keys(allHunkStates)) {
        clearFileHunks(filePath)
      }

      await refreshStatus()
      await refreshOpenDiffs(projectName)
      showSuccessToast(`Committed: ${result.commitId.slice(0, 7)}`)
    } catch (error) {
      logApiError('Failed to commit', error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [commitMessage, setIsLoading, projectName, setCommitMessage, refreshStatus, showSuccessToast, clearFileHunks])

  const handlePush = useCallback(async (): Promise<void> => {
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
      logApiError('Failed to push', error as Error)
    }
  }, [status?.ahead, showInfoToast, projectName, token, refreshStatus, showSuccessToast, showErrorToast])

  const handlePull = useCallback(async (): Promise<void> => {
    try {
      const result = await pullChanges(projectName, token || undefined)
      if (result.success) {
        const isUpToDate = result.message?.toLowerCase().includes('up to date')
        if (isUpToDate) {
          showInfoToast(result.message)
        } else {
          showSuccessToast(result.message)
          useEditorTabStore.getState().refreshAllTabs()
        }
      } else {
        showErrorToast(result.message)
      }
      await refreshStatus()
      await refreshOpenDiffs(projectName)
    } catch (error) {
      logApiError('Failed to pull', error as Error)
    }
  }, [projectName, token, refreshStatus, showInfoToast, showSuccessToast, showErrorToast])

  const hasSelectedChunks = Object.values(fileHunkStates).some(
    (state): boolean => state.selectedHunks.size > 0 || (state.totalHunks === 0 && state.selected),
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <GitToolbar
        status={status}
        onRefresh={(): undefined => void refreshStatus(true)}
        onPush={handlePush}
        onPull={handlePull}
        token={token}
        onTokenChange={setToken}
        hasStoredToken={hasStoredToken}
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
