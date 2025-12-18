interface ConfigurationTileProperties {
  filepath: string
}

export default function ConfigurationTile({ filepath }: Readonly<ConfigurationTileProperties>) {
  const relativePath = filepath.replace(/^src\/main\/configurations\//, '')
  return (
    <div className="border-border bg-backdrop relative m-2 h-50 w-fit max-w-75 min-w-50 rounded border p-4">
      <div className="max-w-full truncate px-2" title={relativePath}>
        {relativePath}
      </div>
    </div>
  )
}
