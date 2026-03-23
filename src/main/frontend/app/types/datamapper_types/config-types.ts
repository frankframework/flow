import type { ReactFlowJsonObject } from '@xyflow/react'
import type { FormatState } from './data-types'

export interface MappingListConfig {
  stage: string
  formatTypes: FormatState
  propertyData: ReactFlowJsonObject
}
