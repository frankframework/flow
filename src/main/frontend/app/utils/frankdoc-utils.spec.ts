// @vitest-environment node
import { getDefaultSourceHandles, resolveForwardsWithInheritance } from './frankdoc-utils'
import type { ElementProperty, FFDocJson } from '@frankframework/doc-library-core'

const FIXED_FORWARD_PIPE_CLASS = 'org.frankframework.pipes.FixedForwardPipe'

function makeRawElements(extras: Record<string, object> = {}): FFDocJson['elements'] {
  return {
    [FIXED_FORWARD_PIPE_CLASS]: {
      name: 'FixedForwardPipe',
      abstract: true,
      forwards: { success: { description: 'successful processing' } },
    },
    ...extras,
  } as FFDocJson['elements']
}

describe('resolveForwardsWithInheritance', () => {
  it('adds success from FixedForwardPipe for a regular pipe with only exception (e.g. EchoPipe)', () => {
    const result = resolveForwardsWithInheritance({ exception: {} }, makeRawElements())
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('exception')
  })

  it('adds success when element has no forwards at all', () => {
    const result = resolveForwardsWithInheritance({}, makeRawElements())
    expect(result).toHaveProperty('success')
  })

  it('adds success when forwards is undefined', () => {
    const result = resolveForwardsWithInheritance(undefined, makeRawElements())
    expect(result).toHaveProperty('success')
  })

  it('does NOT add success for SwitchPipe-style pipes (has empty forward)', () => {
    const result = resolveForwardsWithInheritance(
      { exception: {}, notFound: {}, empty: {}, '*': {} },
      makeRawElements(),
    )
    expect(result).not.toHaveProperty('success')
  })

  it('does NOT add success for IfPipe-style pipes (has then/else forwards)', () => {
    // eslint-disable-next-line unicorn/no-thenable -- 'then' is a Frank forward name here, not a thenable
    const result = resolveForwardsWithInheritance({ exception: {}, then: {}, else: {}, '*': {} }, makeRawElements())
    expect(result).not.toHaveProperty('success')
  })

  it('does NOT add success for CompareStringPipe (has lessthan/greaterthan/equals)', () => {
    const result = resolveForwardsWithInheritance(
      { exception: {}, lessthan: {}, greaterthan: {}, equals: {} },
      makeRawElements(),
    )
    expect(result).not.toHaveProperty('success')
  })

  it('does NOT add success for ForPipe (has stop/continue)', () => {
    const result = resolveForwardsWithInheritance({ exception: {}, stop: {}, continue: {} }, makeRawElements())
    expect(result).not.toHaveProperty('success')
  })

  it('adds success for SenderPipe-style pipes (error forwards but no routing outcomes)', () => {
    const result = resolveForwardsWithInheritance(
      { exception: {}, timeout: {}, illegalResult: {}, '*': {} },
      makeRawElements(),
    )
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('timeout')
  })

  it('does not duplicate success when element already defines it', () => {
    const result = resolveForwardsWithInheritance({ exception: {}, success: {} }, makeRawElements())
    expect(Object.keys(result).filter((k) => k === 'success')).toHaveLength(1)
  })

  it('returns forwards unchanged when FixedForwardPipe is not in rawElements', () => {
    const result = resolveForwardsWithInheritance({ exception: {} }, {})
    expect(result).toEqual({ exception: {} })
    expect(result).not.toHaveProperty('success')
  })
})

describe('getDefaultSourceHandles', () => {
  it('defaults to the success handle when the element supports the success forward', () => {
    expect(getDefaultSourceHandles({ success: {}, exception: {} })).toEqual([{ type: 'success', index: 1 }])
  })

  it('skips the exception error forward when picking the default handle', () => {
    expect(getDefaultSourceHandles({ exception: {}, success: {} })).toEqual([{ type: 'success', index: 1 }])
  })

  it('defaults to the first routing forward for switch pipes (no success forward)', () => {
    expect(getDefaultSourceHandles({ exception: {}, notFound: {}, empty: {}, '*': {} })).toEqual([
      { type: 'notFound', index: 1 },
    ])
  })

  it('maps a wildcard-only forward to a custom default handle', () => {
    expect(getDefaultSourceHandles({ exception: {}, '*': {} })).toEqual([{ type: 'custom', index: 1 }])
  })

  it('falls back to exception when it is the only forward', () => {
    expect(getDefaultSourceHandles({ exception: {} })).toEqual([{ type: 'exception', index: 1 }])
  })

  it('returns no handles when forwards is empty', () => {
    expect(getDefaultSourceHandles({})).toEqual([])
  })

  it('returns no handles when forwards is missing', () => {
    const missing: Record<string, ElementProperty> | undefined = undefined
    expect(getDefaultSourceHandles(missing)).toEqual([])
  })

  it('is consistent with resolveForwardsWithInheritance: a regular pipe defaults to success', () => {
    const resolved = resolveForwardsWithInheritance({ exception: {} }, makeRawElements())
    expect(getDefaultSourceHandles(resolved)).toEqual([{ type: 'success', index: 1 }])
  })

  it('is consistent with resolveForwardsWithInheritance: a SwitchPipe defaults to its first forward', () => {
    const resolved = resolveForwardsWithInheritance(
      { exception: {}, notFound: {}, empty: {}, '*': {} },
      makeRawElements(),
    )
    expect(getDefaultSourceHandles(resolved)).toEqual([{ type: 'notFound', index: 1 }])
  })
})
