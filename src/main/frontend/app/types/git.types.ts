export type GitStatus = {
  staged: string[]
  modified: string[]
  untracked: string[]
  conflicting: string[]
  branch: string
  ahead: number
  behind: number
  hasRemote: boolean
  isLocal: boolean
}

export type GitHunk = {
  index: number
  header: string
  content: string
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
}

export type GitFileDiff = {
  filePath: string
  oldContent: string
  newContent: string
  hunks: GitHunk[]
}

export type GitCommitRequest = {
  message: string
}

export type GitCommitResult = {
  commitId: string
  message: string
  author: string
  timestamp: number
}

export type GitPushResult = {
  success: boolean
  message: string
}

export type GitPullResult = {
  success: boolean
  message: string
  hasConflicts: boolean
}

export type FileHunkState = {
  selectedHunks: Set<number>
  totalHunks: number
  selected: boolean
}
