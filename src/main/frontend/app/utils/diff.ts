import type { Delta } from 'jsondiffpatch'
import * as jsondiffpatch from 'jsondiffpatch'
import type { ReactFlowHistoryState } from '~/stores/flow-store/flow-store-reactflow'

export type FlowHistory = Delta[]
export type FlowHistoryStep = Delta

export const diffpatch = jsondiffpatch.create({})

export function createHistoryStep(
  newState: Partial<ReactFlowHistoryState>,
  oldState: Partial<ReactFlowHistoryState>,
): FlowHistoryStep {
  return diffpatch.diff(oldState, newState)
}
