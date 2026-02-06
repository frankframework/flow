import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import { cloneWithRemappedIds } from './flow-utils'
import type { StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import type { GroupNode } from '~/routes/studio/canvas/nodetypes/group-node'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'

describe('cloneWithRemappedIds', () => {
  let idMap: Map<string, string>
  let counter: number
  let generateId: () => string

  beforeEach(() => {
    idMap = new Map()
    counter = 10
    generateId = () => (counter++).toString() // numeric string IDs
  })

  it('remaps the id field and stores it in the idMap', () => {
    const input = { id: '1' }

    const result = cloneWithRemappedIds(input, idMap, generateId)

    expect(result.id).toBe('10') // first generated ID
    expect(idMap.get('1')).toBe('10')
  })

  it('recursively remaps ids in nested children', () => {
    const input = {
      id: '1',
      children: [
        { id: '2' },
        {
          id: '3',
          children: [{ id: '4' }],
        },
      ],
    }

    const result = cloneWithRemappedIds(input, idMap, generateId)

    expect(result.id).toBe('10')
    expect(result.children[0].id).toBe('11')
    expect(result.children[1].id).toBe('12')
    expect(result.children[1].children[0].id).toBe('13')
  })

  it('keeps shared references consistent', () => {
    const input = {
      id: '1',
      children: [{ id: '2' }, { id: '2' }],
    }

    const result = cloneWithRemappedIds(input, idMap, generateId)

    expect(result.children[0].id).toBe(result.children[1].id)
    expect(idMap.get('2')).toBe(result.children[0].id)
  })

  it('remaps reference keys (source, target, parentId) using the same idMap', () => {
    const node = { id: '1' }
    const edge = {
      id: '10',
      source: '1',
      target: '1',
      parentId: '1',
    }

    const newNode = cloneWithRemappedIds(node, idMap, generateId)
    const newEdge = cloneWithRemappedIds(edge, idMap, generateId)

    expect(newEdge.source).toBe(newNode.id)
    expect(newEdge.target).toBe(newNode.id)
    expect(newEdge.parentId).toBe(newNode.id)
  })

  it('does not remap reference keys if no mapping exists', () => {
    const input = {
      id: '1',
      source: 'UNKNOWN',
    }

    const result = cloneWithRemappedIds(input, idMap, generateId)

    expect(result.source).toBe('UNKNOWN')
  })

  it('handles arrays of objects correctly', () => {
    const input = [{ id: '1' }, { id: '2' }]

    const result = cloneWithRemappedIds(input, idMap, generateId)

    expect(result[0].id).toBe('10')
    expect(result[1].id).toBe('11')
  })

  it('does not add an id if the input object has no id', () => {
    const input = {
      name: 'Node without id',
      children: [{ name: 'Child without id' }],
    }

    const result = cloneWithRemappedIds(input, idMap, generateId)

    // The object itself still has no id
    expect((result as unknown as { id?: string }).id).toBeUndefined()

    // Children also remain without ids
    expect((result.children[0] as unknown as { id?: string }).id).toBeUndefined()

    // Other properties are preserved
    expect(result.name).toBe('Node without id')
    expect(result.children[0].name).toBe('Child without id')
  })
})

describe('cloneWithRemappedIds with various node types', () => {
  let idMap: Map<string, string>
  let counter: number
  let generateId: () => string

  beforeEach(() => {
    idMap = new Map()
    counter = 10
    generateId = () => (counter++).toString()
  })

  it('remaps IDs for FrankNode with children', () => {
    const input: FrankNodeType = {
      id: '1',
      position: { x: 0, y: 0 },
      data: {
        subtype: 'test-subtype',
        type: 'frank',
        name: 'Frank Node',
        sourceHandles: [{ type: 'success', index: 1 }],
        children: [
          { id: '2', subtype: 'child', type: 'type1' },
          { id: '3', subtype: 'child', type: 'type2', children: [{ id: '4', subtype: 'child', type: 'type3' }] },
        ],
      },
    }

    const cloned = cloneWithRemappedIds(input, idMap, generateId)

    expect(cloned.id).not.toBe(input.id)
    expect(cloned.data.children[0].id).not.toBe('2')
    expect(cloned.data.children[1].children![0].id).not.toBe('4')

    // Check idMap
    expect(idMap.get('1')).toBe(cloned.id)
    expect(idMap.get('2')).toBe(cloned.data.children[0].id)
    expect(idMap.get('3')).toBe(cloned.data.children[1].id)
    expect(idMap.get('4')).toBe(cloned.data.children[1].children![0].id)
  })

  it('remaps IDs for StickyNote', () => {
    const input: StickyNote = {
      id: '2',
      position: { x: 0, y: 0 },
      data: { content: 'Note content' },
    }

    const cloned = cloneWithRemappedIds(input, idMap, generateId)
    expect(cloned.id).not.toBe(input.id)
    expect(cloned.data.content).toBe(input.data.content)
    expect(idMap.get('2')).toBe(cloned.id)
  })

  it('remaps IDs for GroupNode', () => {
    const input: GroupNode = {
      id: '3',
      position: { x: 0, y: 0 },
      data: { label: 'Group', width: 100, height: 50 },
    }

    const cloned = cloneWithRemappedIds(input, idMap, generateId)
    expect(cloned.id).not.toBe(input.id)
    expect(cloned.data.label).toBe('Group')
    expect(idMap.get('3')).toBe(cloned.id)
  })

  it('remaps IDs for ExitNode', () => {
    const input: ExitNode = {
      id: '4',
      position: { x: 0, y: 0 },
      data: { subtype: 'exit', type: 'exitType', name: 'Exit Node', attributes: {} },
    }

    const cloned = cloneWithRemappedIds(input, idMap, generateId)
    expect(cloned.id).not.toBe(input.id)
    expect(cloned.data.name).toBe('Exit Node')
    expect(idMap.get('4')).toBe(cloned.id)
  })
})
