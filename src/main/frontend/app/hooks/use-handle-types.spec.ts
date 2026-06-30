import { getHandleTypes } from './use-handle-types'

describe('getHandleTypes', () => {
  it('returns empty array when typesAllowed is undefined', () => {
    expect(getHandleTypes()).toEqual([])
  })

  it('returns empty array when typesAllowed is empty', () => {
    expect(getHandleTypes({})).toEqual([])
  })

  it('returns all forwards as-is', () => {
    const result = getHandleTypes({ success: {}, exception: {}, failure: {} })
    expect(result).toContain('success')
    expect(result).toContain('exception')
    expect(result).toContain('failure')
  })

  it('maps wildcard * to custom', () => {
    const result = getHandleTypes({ '*': {}, exception: {} })
    expect(result).toContain('custom')
    expect(result).toContain('exception')
    expect(result).not.toContain('*')
  })
})
