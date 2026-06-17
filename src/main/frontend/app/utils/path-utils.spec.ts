import { getParentPath, joinPath, normalizePath, stripTrailingSeparators, toRelativePath } from './path-utils'

const USERS_FOO = 'C:/Users/foo'
const PROJECT_MARKER = 'C:/proj/'

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath(String.raw`C:\Users\foo`)).toBe(USERS_FOO)
  })

  it('leaves forward-slash paths untouched', () => {
    expect(normalizePath(USERS_FOO)).toBe(USERS_FOO)
  })

  it('shows a drive root with a forward slash', () => {
    expect(normalizePath('C:\\')).toBe('C:/')
  })
})

describe('stripTrailingSeparators', () => {
  it('removes trailing separators from a regular path', () => {
    expect(stripTrailingSeparators(`${USERS_FOO}/`)).toBe(USERS_FOO)
    expect(stripTrailingSeparators(`${USERS_FOO}///`)).toBe(USERS_FOO)
    expect(stripTrailingSeparators('/home/foo/')).toBe('/home/foo')
  })

  it('keeps a Windows drive root as "C:/"', () => {
    expect(stripTrailingSeparators('C:/')).toBe('C:/')
    expect(stripTrailingSeparators('C:\\')).toBe('C:/')
    expect(stripTrailingSeparators('C:')).toBe('C:/')
  })

  it('keeps the Unix root as "/"', () => {
    expect(stripTrailingSeparators('/')).toBe('/')
    expect(stripTrailingSeparators('///')).toBe('/')
  })

  it('returns empty input unchanged', () => {
    expect(stripTrailingSeparators('')).toBe('')
  })
})

describe('joinPath', () => {
  it('joins a base and a segment with a single forward slash', () => {
    expect(joinPath('C:/Users', 'foo')).toBe(USERS_FOO)
  })

  it('tolerates a trailing separator on the base', () => {
    expect(joinPath('C:/Users/', 'foo')).toBe(USERS_FOO)
    expect(joinPath('/home//', 'foo')).toBe('/home/foo')
  })

  it('tolerates a leading separator on the segment', () => {
    expect(joinPath('C:/Users', '/foo')).toBe(USERS_FOO)
  })

  it('collapses a drive root into an absolute path (never drive-relative)', () => {
    expect(joinPath('C:\\', 'foo')).toBe('C:/foo')
    expect(joinPath('C:/', 'foo')).toBe('C:/foo')
  })

  it('treats an empty base as the Unix root', () => {
    expect(joinPath('', 'foo')).toBe('/foo')
  })
})

describe('getParentPath', () => {
  it('returns the parent directory', () => {
    expect(getParentPath('C:/Users/MyProject')).toBe('C:/Users')
  })

  it('keeps the drive root separator when the parent is the drive', () => {
    expect(getParentPath('C:/MyProject')).toBe('C:/')
  })

  it('returns empty input unchanged', () => {
    expect(getParentPath('')).toBe('')
  })
})

describe('toRelativePath', () => {
  it('returns the portion of the path after the marker', () => {
    expect(toRelativePath(`${PROJECT_MARKER}Configuration.xml`, PROJECT_MARKER)).toBe('Configuration.xml')
  })

  it('preserves nested subfolders', () => {
    expect(toRelativePath(`${PROJECT_MARKER}sub/Config.xml`, PROJECT_MARKER)).toBe('sub/Config.xml')
  })

  it('matches even when path and marker use different separators', () => {
    expect(toRelativePath(String.raw`C:\proj\sub\Config.xml`, PROJECT_MARKER)).toBe('sub/Config.xml')
  })

  it('returns null when the marker is not present', () => {
    expect(toRelativePath('C:/other/file.xml', PROJECT_MARKER)).toBeNull()
  })
})
