import { getDefaultSourceHandles, resolveForwardsWithInheritance } from './frankdoc-utils'
import type { ElementClass, ElementProperty } from '@frankframework/doc-library-core'

const FIXED_FORWARD_PIPE_FQN = 'org.frankframework.pipes.FixedForwardPipe'
const ABSTRACT_PIPE_FQN = 'org.frankframework.pipes.AbstractPipe'

const TEST_ELEMENTS: Record<string, ElementClass> = {
  [ABSTRACT_PIPE_FQN]: {
    name: 'AbstractPipe',
    abstract: true,
    forwards: { exception: { description: 'error occurred' } },
  },
  [FIXED_FORWARD_PIPE_FQN]: {
    name: 'FixedForwardPipe',
    abstract: true,
    parent: ABSTRACT_PIPE_FQN,
    forwards: { success: { description: 'successful processing' } },
  },
}

function echoPipe(overrides: Partial<ElementClass> = {}): ElementClass {
  return { name: 'EchoPipe', parent: FIXED_FORWARD_PIPE_FQN, ...overrides }
}

describe('resolveForwardsWithInheritance', () => {
  it('inherits success for a non-router pipe via the parent chain (e.g. EchoPipe)', () => {
    const result = resolveForwardsWithInheritance(echoPipe({ forwards: { exception: {} } }), TEST_ELEMENTS)
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('exception')
  })

  it('inherits success for a non-router pipe with no own forwards', () => {
    const result = resolveForwardsWithInheritance(echoPipe(), TEST_ELEMENTS)
    expect(result).toHaveProperty('success')
  })

  it('returns empty forwards when the element is missing', () => {
    expect(resolveForwardsWithInheritance()).toEqual({})
  })

  it('returns only own forwards when no elements map is provided (no inheritance)', () => {
    const result = resolveForwardsWithInheritance(echoPipe({ forwards: { exception: {} } }))
    expect(result).not.toHaveProperty('success')
    expect(result).toHaveProperty('exception')
  })

  it('inherits success for an endpoint pipe with error forwards (e.g. SenderPipe)', () => {
    const result = resolveForwardsWithInheritance(
      echoPipe({ forwards: { exception: {}, timeout: {}, '*': {} }, labels: { EIP: 'Endpoint' } }),
      TEST_ELEMENTS,
    )
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('timeout')
  })

  it('does NOT include success for a router pipe (EIP=Router, e.g. SwitchPipe)', () => {
    const result = resolveForwardsWithInheritance(
      echoPipe({ forwards: { exception: {}, notFound: {}, empty: {}, '*': {} }, labels: { EIP: 'Router' } }),
      TEST_ELEMENTS,
    )
    expect(result).not.toHaveProperty('success')
  })

  it('does NOT include success for a wildcard-only router (e.g. CounterSwitchPipe)', () => {
    const result = resolveForwardsWithInheritance(
      echoPipe({ forwards: { exception: {}, '*': {} }, labels: { EIP: 'Router' } }),
      TEST_ELEMENTS,
    )
    expect(result).not.toHaveProperty('success')
  })

  it('does not duplicate success when the element already defines it as an own forward', () => {
    const result = resolveForwardsWithInheritance(echoPipe({ forwards: { exception: {}, success: {} } }), TEST_ELEMENTS)
    expect(Object.keys(result).filter((forward) => forward === 'success')).toHaveLength(1)
  })

  it('own forwards take precedence over inherited forwards', () => {
    const ownDesc = 'custom description'
    const result = resolveForwardsWithInheritance(
      echoPipe({ forwards: { success: { description: ownDesc } } }),
      TEST_ELEMENTS,
    )
    expect(result.success?.description).toBe(ownDesc)
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
    expect(
      getDefaultSourceHandles(resolveForwardsWithInheritance(echoPipe({ forwards: { exception: {} } }), TEST_ELEMENTS)),
    ).toEqual([{ type: 'success', index: 1 }])
  })

  it('is consistent with resolveForwardsWithInheritance: a router pipe defaults to its first forward', () => {
    const resolved = resolveForwardsWithInheritance(
      echoPipe({ forwards: { exception: {}, notFound: {}, empty: {}, '*': {} }, labels: { EIP: 'Router' } }),
      TEST_ELEMENTS,
    )
    expect(getDefaultSourceHandles(resolved)).toEqual([{ type: 'notFound', index: 1 }])
  })
})
