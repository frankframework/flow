import { useState } from 'react'
import clsx from 'clsx'
import type { GitStatus } from '~/types/git.types'
import IconButton from '~/components/inputs/icon-button'
import IconLabelButton from '~/components/inputs/icon-label-button'
import Input from '~/components/inputs/input'
import RefreshIcon from '/icons/solar/Refresh.svg?react'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'
import AltArrowUpIcon from '/icons/solar/Alt Arrow Up.svg?react'
import KeyIcon from '/icons/solar/Key.svg?react'

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
        <IconButton onClick={onRefresh} title="Refresh status">
          <RefreshIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
        </IconButton>
      </div>

      {status?.hasRemote && (
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <IconLabelButton
            icon={<AltArrowDownIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />}
            label={isPulling ? '...' : 'Pull'}
            onClick={handlePull}
            className={clsx('flex-1 justify-center', isPulling && 'cursor-not-allowed opacity-50')}
          />
          <IconLabelButton
            icon={<AltArrowUpIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />}
            label={isPushing ? '...' : 'Push'}
            onClick={handlePush}
            className={clsx(
              'flex-1 justify-center',
              (isPushing || (status?.ahead ?? 0) === 0) && 'cursor-not-allowed opacity-50',
            )}
          />
          {!status?.isLocal && (
            <IconButton
              onClick={() => setShowToken(!showToken)}
              title="Authentication token for private repos"
              className={clsx(showToken && 'bg-selected')}
            >
              <KeyIcon className="fill-foreground-muted group-hover:fill-foreground h-4 w-4" />
            </IconButton>
          )}
        </div>
      )}

      {showToken && !status?.isLocal && (
        <div className="border-t-border border-t px-2 py-1.5">
          <Input
            type="password"
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder={
              hasStoredToken ? 'Using saved token (override here)' : 'Personal access token (for private repos)'
            }
          />
        </div>
      )}
    </div>
  )
}
