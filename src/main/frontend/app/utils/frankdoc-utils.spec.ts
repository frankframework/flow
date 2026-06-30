// @vitest-environment node
import { getDefaultSourceHandles, resolveForwardsWithInheritance } from './frankdoc-utils'
import type { ElementProperty } from '@frankframework/doc-library-core'

describe('resolveForwardsWithInheritance', () => {
  it('adds success for a non-router pipe with only an exception forward (e.g. EchoPipe)', () => {
    const result = resolveForwardsWithInheritance({ forwards: { exception: {} } })
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('exception')
  })

  it('adds success for a non-router pipe without any forwards', () => {
    expect(resolveForwardsWithInheritance({})).toHaveProperty('success')
  })

  it('adds success when the element is missing', () => {
    expect(resolveForwardsWithInheritance()).toHaveProperty('success')
  })

  it('adds success for an endpoint pipe with error forwards (e.g. SenderPipe)', () => {
    const result = resolveForwardsWithInheritance({
      forwards: { exception: {}, timeout: {}, '*': {} },
      labels: { EIP: 'Endpoint' },
    })
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('timeout')
  })

  it('does NOT add success for a router pipe (EIP=Router, e.g. SwitchPipe)', () => {
    const result = resolveForwardsWithInheritance({
      forwards: { exception: {}, notFound: {}, empty: {}, '*': {} },
      labels: { EIP: 'Router' },
    })
    expect(result).not.toHaveProperty('success')
  })

  it('does NOT add success for a wildcard-only router (e.g. CounterSwitchPipe)', () => {
    const result = resolveForwardsWithInheritance({ forwards: { exception: {}, '*': {} }, labels: { EIP: 'Router' } })
    expect(result).not.toHaveProperty('success')
  })

  it('does not duplicate success when the element already defines it', () => {
    const result = resolveForwardsWithInheritance({ forwards: { exception: {}, success: {} } })
    expect(Object.keys(result).filter((forward) => forward === 'success')).toHaveLength(1)
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

  it('is consistent with resolveForwardsWithInheritance: a non-router pipe defaults to success', () => {
    expect(getDefaultSourceHandles(resolveForwardsWithInheritance({ forwards: { exception: {} } }))).toEqual([
      { type: 'success', index: 1 },
    ])
  })

  it('is consistent with resolveForwardsWithInheritance: a router pipe defaults to its first forward', () => {
    const resolved = resolveForwardsWithInheritance({
      forwards: { exception: {}, notFound: {}, empty: {}, '*': {} },
      labels: { EIP: 'Router' },
    })
    expect(getDefaultSourceHandles(resolved)).toEqual([{ type: 'notFound', index: 1 }])
  })
})
