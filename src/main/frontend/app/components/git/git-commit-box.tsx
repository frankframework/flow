interface GitCommitBoxProps {
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
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Commit message..."
        className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded border p-2.5 text-xs focus:outline-none"
        rows={4}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (canCommit) onCommit()
          }
        }}
      />
      <button
        onClick={onCommit}
        disabled={!canCommit}
        className="bg-brand hover:bg-brand/90 mt-1.5 w-full cursor-pointer rounded px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isLoading ? 'Committing...' : 'Commit'}
      </button>
    </div>
  )
}
