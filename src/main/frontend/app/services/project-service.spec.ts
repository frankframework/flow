import { importProjectFolder, ImportTooLargeError, MAX_IMPORT_UNCOMPRESSED_BYTES } from './project-service'

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({ name: 'proj', rootPath: '/tmp/proj', filepaths: [] })),
  apiUrl: (path: string) => path,
}))

vi.mock('fflate', () => ({
  zip: (
    _entries: Record<string, Uint8Array>,
    _options: unknown,
    callback: (error: Error | null, data: Uint8Array) => void,
  ) => callback(null, new Uint8Array(8)),
}))

function makeFile(relativePath: string, sizeOverride?: number): File {
  const file = new File([new Uint8Array(4)], relativePath.split('/').pop() ?? 'file')
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(new ArrayBuffer(4)) })
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeOverride })
  }
  return file
}

function fileList(...files: File[]): FileList {
  return files as unknown as FileList
}

describe('importProjectFolder', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects with an uncompressed ImportTooLargeError when the folder exceeds the limit', async () => {
    const half = MAX_IMPORT_UNCOMPRESSED_BYTES / 2
    const files = fileList(makeFile('proj/big1.bin', half + 1), makeFile('proj/big2.bin', half + 1))

    const error = await importProjectFolder(files).catch((error_: unknown) => error_)

    expect(error).toBeInstanceOf(ImportTooLargeError)
    expect((error as ImportTooLargeError).kind).toBe('uncompressed')
    expect((error as ImportTooLargeError).bytes).toBe((half + 1) * 2)
  })

  it('ignores the top-level folder entry (empty relative path) when summing sizes', async () => {
    const files = fileList(makeFile('proj', MAX_IMPORT_UNCOMPRESSED_BYTES), makeFile('proj/Configuration.xml', 10))

    await expect(importProjectFolder(files)).resolves.toMatchObject({ name: 'proj' })
  })

  it('uploads folders that stay within the limit', async () => {
    const files = fileList(
      makeFile('proj/Configuration.xml', 100),
      makeFile('proj/src/main/resources/application.properties', 50),
    )

    await expect(importProjectFolder(files)).resolves.toMatchObject({ name: 'proj' })
  })
})
