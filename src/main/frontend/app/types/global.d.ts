// Must stay an `interface` to augment the global `Window` (declaration merging).
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
}
