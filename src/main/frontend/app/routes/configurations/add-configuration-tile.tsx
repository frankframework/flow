interface AddConfigurationTileProertiess {
  onClick?: () => void
}

export default function AddConfigurationTile({ onClick }: Readonly<AddConfigurationTileProertiess>) {
  return (
    <div
      className="border-border hover:bg-backdrop hover:text-foreground-active relative m-2 h-50 w-40 cursor-pointer rounded border p-4"
      onClick={onClick}
    >
      {/* top-left label */}

      {/* big plus centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl leading-none font-extrabold">+</span>
      </div>
    </div>
  )
}
