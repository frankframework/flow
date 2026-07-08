type AddConfigurationTileProertiess = {
  onClick?: () => void
}

export default function AddConfigurationFileTile({ onClick }: Readonly<AddConfigurationTileProertiess>) {
  return (
    <div
      className="border-border hover:bg-hover text-foreground-muted hover:text-foreground relative h-40 w-40 cursor-pointer rounded border p-4"
      onClick={onClick}
      title="New Configuration"
    >
      {/* big plus centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl leading-none font-extrabold">+</span>
      </div>
    </div>
  )
}
