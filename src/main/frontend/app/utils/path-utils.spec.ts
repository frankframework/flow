import {
  containsPathSeparator,
  getBaseName,
  getParentPath,
  joinPath,
  normalizePath,
  relativeTo,
  stripTrailingSeparators,
} from './path-utils'

const USERS_FOO = 'C:/Users/foo'
const PROJECT_ROOT = 'C:/proj'
const CONFIG_FILE = 'Config.xml'
const SUB_CONFIG = `sub/${CONFIG_FILE}`

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

describe('containsPathSeparator', () => {
  it('detects forward and back slashes', () => {
    expect(containsPathSeparator('a/b')).toBe(true)
    expect(containsPathSeparator(String.raw`a\b`)).toBe(true)
  })

  it('is false for a plain segment', () => {
    expect(containsPathSeparator(CONFIG_FILE)).toBe(false)
  })
})

describe('stripTrailingSeparators', () => {
  it('removes trailing separators from a regular path', () => {
    expect(stripTrailingSeparators(`${USERS_FOO}/`)).toBe(USERS_FOO)
    expect(stripTrailingSeparators(`${USERS_FOO}///`)).toBe(USERS_FOO)
    expect(stripTrailingSeparators('/home/foo/')).toBe('/home/foo')
  })

  it('normalizes backslashes while stripping', () => {
    expect(stripTrailingSeparators('C:\\Users\\foo\\')).toBe(USERS_FOO)
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

describe('getBaseName', () => {
  it('returns the last segment', () => {
    expect(getBaseName(`${PROJECT_ROOT}/${SUB_CONFIG}`)).toBe(CONFIG_FILE)
    expect(getBaseName(String.raw`C:\proj\sub\Config.xml`)).toBe(CONFIG_FILE)
  })

  it('ignores trailing separators', () => {
    expect(getBaseName(`${PROJECT_ROOT}/sub/`)).toBe('sub')
  })

  it('returns the input when there is no separator', () => {
    expect(getBaseName(CONFIG_FILE)).toBe(CONFIG_FILE)
  })

  it('returns an empty string for an empty path', () => {
    expect(getBaseName('')).toBe('')
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

  it('normalizes backslashes in either argument', () => {
    expect(joinPath(String.raw`C:\Users`, 'foo')).toBe(USERS_FOO)
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

  it('normalizes backslashes', () => {
    expect(getParentPath(String.raw`C:\Users\MyProject`)).toBe('C:/Users')
  })

  it('keeps the drive root separator when the parent is the drive', () => {
    expect(getParentPath('C:/MyProject')).toBe('C:/')
  })

  it('returns empty input unchanged', () => {
    expect(getParentPath('')).toBe('')
  })
})

describe('relativeTo', () => {
  it('returns the portion of the path below the base', () => {
    expect(relativeTo(PROJECT_ROOT, `${PROJECT_ROOT}/Configuration.xml`)).toBe('Configuration.xml')
  })

  it('preserves nested subfolders', () => {
    expect(relativeTo(PROJECT_ROOT, `${PROJECT_ROOT}/${SUB_CONFIG}`)).toBe(SUB_CONFIG)
  })

  it('tolerates a trailing separator on the base', () => {
    expect(relativeTo(`${PROJECT_ROOT}/`, `${PROJECT_ROOT}/${SUB_CONFIG}`)).toBe(SUB_CONFIG)
  })

  it('matches even when base and target use different separators', () => {
    expect(relativeTo(PROJECT_ROOT, String.raw`C:\proj\sub\Config.xml`)).toBe(SUB_CONFIG)
  })

  it('returns an empty string when target equals base', () => {
    expect(relativeTo(PROJECT_ROOT, `${PROJECT_ROOT}/`)).toBe('')
  })

  it('returns null when target is not inside base', () => {
    expect(relativeTo(PROJECT_ROOT, 'C:/other/file.xml')).toBeNull()
  })
})
