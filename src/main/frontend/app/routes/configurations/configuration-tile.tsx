interface ConfigurationTileProperties {
  filename: string
}

export default function ConfigurationTile({ filename }: Readonly<ConfigurationTileProperties>) {
  return (
    <div className="border-border bg-backdrop m-2 h-50 w-fit rounded border p-4">
      <div className="px-2">{filename}</div>
      <p className="hover:bg-background w-full rounded px-2 hover:cursor-pointer">Edit</p>
      <button className="hover:bg-background w-full rounded px-2 text-left hover:cursor-pointer">Delete</button>
    </div>
  )
}
