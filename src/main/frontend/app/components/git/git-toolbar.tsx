import { useState } from 'react'
import clsx from 'clsx'
import type { GitStatus } from '~/types/git.types'
import Button from '~/components/inputs/button'

interface GitToolbarProps {
  status: GitStatus | null
  onRefresh: () => void
  onPush: () => void
  onPull: () => void
  token: string
  onTokenChange: (token: string) => void
  hasStoredToken: boolean
}

export default function GitToolbar({
  status,
  onRefresh,
  onPush,
  onPull,
  token,
  onTokenChange,
  hasStoredToken,
}: GitToolbarProps) {
  const [isPushing, setIsPushing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const handlePush = async () => {
    setIsPushing(true)
    try {
      await onPush()
    } finally {
      setIsPushing(false)
    }
  }

  const handlePull = async () => {
    setIsPulling(true)
    try {
      await onPull()
    } finally {
      setIsPulling(false)
    }
  }

  return (
    <div className="border-b-border border-b">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <span className="bg-brand/10 text-brand rounded-full px-2.5 py-0.5 text-xs font-medium">
            {status?.branch ?? '...'}
          </span>
          {status && status.ahead > 0 && (
            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
              ↑{status.ahead}
            </span>
          )}
          {status && status.behind > 0 && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              ↓{status.behind}
            </span>
          )}
        </div>
        <Button onClick={onRefresh} className="px-2 py-1 text-xs" title="Refresh status">
          ↻
        </Button>
      </div>
      {status?.hasRemote && (
        <div className="flex gap-1.5 px-2 pb-2">
          <Button
            onClick={handlePull}
            disabled={isPulling}
            className="flex-1 py-1.5 text-xs disabled:opacity-50"
            title="Pull"
          >
            {isPulling ? '...' : '↓ Pull'}
          </Button>
          <Button
            onClick={handlePush}
            disabled={isPushing || (status?.ahead ?? 0) === 0}
            className="flex-1 py-1.5 text-xs disabled:opacity-50"
            title={status.ahead === 0 ? 'Nothing to push' : 'Push'}
          >
            {isPushing ? '...' : '↑ Push'}
          </Button>
          {!status?.isLocal && (
            <Button
              onClick={() => setShowToken(!showToken)}
              className={clsx('px-2 py-1.5 text-xs', showToken && 'bg-selected')}
              title="Authentication token for private repos"
            >
              🔑
            </Button>
          )}
        </div>
      )}
      {showToken && !status?.isLocal && (
        <div className="border-t-border border-t px-2 py-1.5">
          <input
            type="password"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder={
              hasStoredToken ? 'Using saved token (override here)' : 'Personal access token (for private repos)'
            }
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded border px-2 py-1 text-xs focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
