import type { JSX } from 'react'
import { type NonCanvasComponent } from '~/services/non-canvas-component-service'
import ComponentRow from './component-row'

type ComponentListItemProperties = {
  component: NonCanvasComponent
  onConfigure: () => void
}

function getComponentLabels(component: NonCanvasComponent): { typeLabel: string | null; primaryLabel: string } {
  const primary = component.tagName === 'Include' ? component.attributes.ref : component.name
  if (primary && primary.trim()) {
    return { typeLabel: component.tagName, primaryLabel: primary }
  }
  return { typeLabel: null, primaryLabel: component.tagName }
}

export default function ComponentListItem({
  component,
  onConfigure,
}: Readonly<ComponentListItemProperties>): JSX.Element {
  const { typeLabel, primaryLabel } = getComponentLabels(component)
  return <ComponentRow typeLabel={typeLabel} primaryLabel={primaryLabel} onConfigure={onConfigure} />
}
