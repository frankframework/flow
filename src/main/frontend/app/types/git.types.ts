export interface GitStatus {
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

export interface GitHunk {
  index: number
  header: string
  content: string
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
}

export interface GitFileDiff {
  filePath: string
  oldContent: string
  newContent: string
  hunks: GitHunk[]
}

export interface GitCommitRequest {
  message: string
}

export interface GitCommitResult {
  commitId: string
  message: string
  author: string
  timestamp: number
}

export interface GitPushResult {
  success: boolean
  message: string
}

export interface GitPullResult {
  success: boolean
  message: string
  hasConflicts: boolean
}

export interface FileHunkState {
  selectedHunks: Set<number>
  totalHunks: number
}
