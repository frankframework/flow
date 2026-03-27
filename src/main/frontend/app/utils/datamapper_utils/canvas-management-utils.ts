import type { Node } from '@xyflow/react'
import { MAPPING_TABLE_WIDTH, OBJECT_HEIGHT, TABLE_WIDTH } from './constant'

export function updateCanvasSize(nodes: Node[], currentSize: { height: number }) {
  const maxY = nodes.reduce((max, node) => {
    const nodeHeight = node.height ?? OBJECT_HEIGHT
    const nodeBottom = (node.position.y ?? 0) + nodeHeight + 20
    return Math.max(max, nodeBottom)
  }, 0)

  if (maxY > currentSize.height) {
    return { ...currentSize, height: maxY }
  }
  return { ...currentSize, height: maxY }
}
export interface TablePositions {
  sourceX: number
  mappingX: number
  targetX: number
}

export function getTablePositions(width: number): TablePositions {
  const padding = (width - TABLE_WIDTH * 2 - MAPPING_TABLE_WIDTH) / 4

  const sourceX = padding
  const mappingX = sourceX + padding + TABLE_WIDTH
  const targetX = mappingX + MAPPING_TABLE_WIDTH + padding

  return { sourceX, mappingX, targetX }
}
