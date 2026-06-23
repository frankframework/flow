import Button from '~/components/inputs/button'

type GitCommitBoxProps = {
  commitMessage: string
  onMessageChange: (message: string) => void
  onCommit: () => void
  hasSelectedChunks: boolean
  isLoading: boolean
}

export default function GitCommitBox({
  commitMessage,
  onMessageChange,
  onCommit,
  hasSelectedChunks,
  isLoading,
}: GitCommitBoxProps) {
  const canCommit = hasSelectedChunks && !!commitMessage.trim() && !isLoading

  return (
    <div className="border-t-border border-t p-2">
      <textarea
        value={commitMessage}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder="Commit message..."
        className="border-border bg-background text-foreground placeholder:text-foreground-muted w-full resize-none rounded border p-2.5 text-xs focus:outline-none"
        rows={4}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === 'Enter' && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
            keyboardEvent.preventDefault()
            if (canCommit) onCommit()
          }
        }}
      />
      <Button
        variant="primary"
        onClick={onCommit}
        disabled={!canCommit}
        className="mt-1.5 w-full rounded px-2 py-1.5 text-xs"
      >
        {isLoading ? 'Committing...' : 'Commit'}
      </Button>
    </div>
  )
}
