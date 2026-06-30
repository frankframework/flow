import { extractSourceHandles, type ResolveForwards } from './xml-to-json-parser'
import type { ElementProperty } from '@frankframework/doc-library-core'

function elementFromXml(xml: string): Element {
  const document_ = new DOMParser().parseFromString(xml, 'text/xml')
  return document_.documentElement
}

const FORWARDS: Record<string, Record<string, ElementProperty>> = {
  EchoPipe: { success: {}, exception: {} },
  IfPipe: { exception: {}, '*': {}, else: {} },
  SwitchPipe: { exception: {}, notFound: {}, empty: {}, '*': {} },
}

const resolveForwards: ResolveForwards = (subtype) => FORWARDS[subtype]

describe('extractSourceHandles', () => {
  it('creates a handle per <forward> for any element type', () => {
    const element = elementFromXml(
      '<IfPipe name="x"><forward name="exception" path="" /><forward name="then" path="" /><forward name="else" path="" /></IfPipe>',
    )
    expect(extractSourceHandles(element, resolveForwards)).toEqual([
      { type: 'exception', index: 1 },
      { type: 'then', index: 2 },
      { type: 'else', index: 3 },
    ])
  })

  it('does NOT add an implicit success handle to a routing pipe (IfPipe)', () => {
    const element = elementFromXml(
      '<IfPipe name="x"><forward name="exception" path="" /><forward name="then" path="" /><forward name="else" path="" /></IfPipe>',
    )
    const handles = extractSourceHandles(element, resolveForwards)
    expect(handles.some((handle) => handle.type === 'success')).toBe(false)
  })

  it('adds the implicit success fall-through handle for a FixedForwardPipe subclass with only an exception forward', () => {
    const element = elementFromXml('<EchoPipe name="x"><forward name="exception" path="" /></EchoPipe>')
    expect(extractSourceHandles(element, resolveForwards)).toEqual([
      { type: 'exception', index: 1 },
      { type: 'success', index: 2 },
    ])
  })

  it('keeps an explicit success forward without duplicating it', () => {
    const element = elementFromXml('<EchoPipe name="x"><forward name="success" path="" /></EchoPipe>')
    expect(extractSourceHandles(element, resolveForwards)).toEqual([{ type: 'success', index: 1 }])
  })

  it('uses the FrankDoc default handle when no forwards are declared (EchoPipe -> success)', () => {
    const element = elementFromXml('<EchoPipe name="x" />')
    expect(extractSourceHandles(element, resolveForwards)).toEqual([{ type: 'success', index: 1 }])
  })

  it('uses the FrankDoc default handle when no forwards are declared (SwitchPipe -> first routing forward)', () => {
    const element = elementFromXml('<SwitchPipe name="x" />')
    expect(extractSourceHandles(element, resolveForwards)).toEqual([{ type: 'notFound', index: 1 }])
  })

  it('falls back to a single success handle when no FrankDoc resolver is provided', () => {
    const element = elementFromXml('<SwitchPipe name="x" />')
    expect(extractSourceHandles(element)).toEqual([{ type: 'success', index: 1 }])
  })

  it('keeps adding the implicit success handle without a resolver (legacy behaviour)', () => {
    const element = elementFromXml(
      '<IfPipe name="x"><forward name="then" path="" /><forward name="else" path="" /></IfPipe>',
    )
    expect(extractSourceHandles(element)).toEqual([
      { type: 'then', index: 1 },
      { type: 'else', index: 2 },
      { type: 'success', index: 3 },
    ])
  })
})
