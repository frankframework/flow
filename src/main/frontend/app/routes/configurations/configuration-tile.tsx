interface ConfigurationTileProperties {
  filename: string
}

export default function ConfigurationTile({ filename }: Readonly<ConfigurationTileProperties>) {
  return (
    <div className="border-border bg-backdrop relative m-2 h-50 w-fit min-w-50 rounded border p-4">
      <div className="px-2">{filename}</div>
    </div>
  )
}
