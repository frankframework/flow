import { beforeEach, describe, expect, it } from 'vitest'
import { useSidebarStore, SidebarSide } from './sidebar-layout-store'

const UNKNOWN = 'unknown'
const DOES_NOTHING_FOR_UNKNOWN = 'does nothing for an unknown instance'

beforeEach(() => {
  useSidebarStore.setState({ instances: {} })
})

describe('initializeInstance', () => {
  it('creates an instance with default visibility', () => {
    useSidebarStore.getState().initializeInstance('test')
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, true])
    expect(useSidebarStore.getState().getSizes('test')).toEqual([])
  })

  it('creates an instance with custom visibility', () => {
    useSidebarStore.getState().initializeInstance('test', [false, true, false])
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([false, true, false])
  })

  it('does not overwrite an existing instance', () => {
    useSidebarStore.getState().initializeInstance('test', [false, false, false])
    useSidebarStore.getState().initializeInstance('test', [true, true, true])
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([false, false, false])
  })

  it('supports multiple independent instances', () => {
    useSidebarStore.getState().initializeInstance('a')
    useSidebarStore.getState().initializeInstance('b', [false, false, false])
    expect(useSidebarStore.getState().getVisibility('a')).toEqual([true, true, true])
    expect(useSidebarStore.getState().getVisibility('b')).toEqual([false, false, false])
  })
})

describe('toggleSidebar', () => {
  beforeEach(() => {
    useSidebarStore.getState().initializeInstance('test')
  })

  it('toggles a side off', () => {
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.RIGHT)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, false])
  })

  it('toggles a side back on', () => {
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.RIGHT)
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.RIGHT)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, true])
  })

  it('does not affect other sides', () => {
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.LEFT)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([false, true, true])
  })

  it(DOES_NOTHING_FOR_UNKNOWN, () => {
    useSidebarStore.getState().toggleSidebar(UNKNOWN, SidebarSide.RIGHT)
    expect(useSidebarStore.getState().getVisibility(UNKNOWN)).toBeUndefined()
  })
})

describe('setVisible', () => {
  beforeEach(() => {
    useSidebarStore.getState().initializeInstance('test')
  })

  it('sets a side to false', () => {
    useSidebarStore.getState().setVisible('test', SidebarSide.RIGHT, false)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, false])
  })

  it('sets a side to true when already true (idempotent)', () => {
    useSidebarStore.getState().setVisible('test', SidebarSide.RIGHT, true)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, true])
  })

  it('does not affect other sides', () => {
    useSidebarStore.getState().setVisible('test', SidebarSide.RIGHT, false)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, false])
  })

  it(DOES_NOTHING_FOR_UNKNOWN, () => {
    useSidebarStore.getState().setVisible(UNKNOWN, SidebarSide.RIGHT, false)
    expect(useSidebarStore.getState().getVisibility(UNKNOWN)).toBeUndefined()
  })
})

describe('setSizes', () => {
  beforeEach(() => {
    useSidebarStore.getState().initializeInstance('test')
  })

  it('starts with empty sizes', () => {
    expect(useSidebarStore.getState().getSizes('test')).toEqual([])
  })

  it('stores and retrieves sizes', () => {
    useSidebarStore.getState().setSizes('test', [300, 700, 300])
    expect(useSidebarStore.getState().getSizes('test')).toEqual([300, 700, 300])
  })

  it('overwrites existing sizes', () => {
    useSidebarStore.getState().setSizes('test', [200, 600, 200])
    useSidebarStore.getState().setSizes('test', [100, 800, 100])
    expect(useSidebarStore.getState().getSizes('test')).toEqual([100, 800, 100])
  })

  it(DOES_NOTHING_FOR_UNKNOWN, () => {
    useSidebarStore.getState().setSizes(UNKNOWN, [200, 600, 200])
    expect(useSidebarStore.getState().getSizes(UNKNOWN)).toBeUndefined()
  })
})

describe('getSizes', () => {
  it('returns undefined for unknown instance', () => {
    expect(useSidebarStore.getState().getSizes(UNKNOWN)).toBeUndefined()
  })

  it('returns stored sizes', () => {
    useSidebarStore.getState().initializeInstance('test')
    useSidebarStore.getState().setSizes('test', [400, 800, 300])
    expect(useSidebarStore.getState().getSizes('test')).toEqual([400, 800, 300])
  })
})

describe('getVisibility', () => {
  it('returns undefined for unknown instance', () => {
    expect(useSidebarStore.getState().getVisibility(UNKNOWN)).toBeUndefined()
  })

  it('returns stored visibility', () => {
    useSidebarStore.getState().initializeInstance('test', [true, true, false])
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, false])
  })

  it('reflects changes after setVisible', () => {
    useSidebarStore.getState().initializeInstance('test')
    useSidebarStore.getState().setVisible('test', SidebarSide.RIGHT, false)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([true, true, false])
  })

  it('reflects changes after toggleSidebar', () => {
    useSidebarStore.getState().initializeInstance('test')
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.LEFT)
    useSidebarStore.getState().toggleSidebar('test', SidebarSide.RIGHT)
    expect(useSidebarStore.getState().getVisibility('test')).toEqual([false, true, false])
  })
})
