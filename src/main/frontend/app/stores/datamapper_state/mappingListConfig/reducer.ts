import type { Node, Edge, ReactFlowJsonObject } from '@xyflow/react'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { DataTypeSchema } from '~/types/datamapper_types/data-types'

export const DEFAULT_MAPPING_LIST_CONFIG: MappingListConfig = {
  stage: 'INIT',
  formatTypes: {
    source: null,
    target: null,
  },
  propertyData: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 0 },
  },
}

export type ConfigActions =
  | { type: 'SET_SOURCE_FORMAT'; payload: DataTypeSchema[number] | null }
  | { type: 'SET_TARGET_FORMAT'; payload: DataTypeSchema[number] | null }
  | { type: 'SET_SOURCE_PATH'; payload: string }
  | { type: 'SET_TARGET_PATH'; payload: string }
  | { type: 'SET_STAGE'; payload: string }
  | { type: 'IMPORT_CONFIG'; payload: MappingListConfig }
  | { type: 'SET_PROPERTY_DATA'; payload: ReactFlowJsonObject }
  | {
      type: 'SET_PROPERTY_DATA_NODES_EDGES'
      payload: { nodes: Node[]; edges: Edge[] }
    }

export function mappingListConfigReducer(state: MappingListConfig, action: ConfigActions): MappingListConfig {
  switch (action.type) {
    case 'SET_SOURCE_FORMAT': {
      return {
        ...state,
        formatTypes: {
          ...state.formatTypes,
          source: action.payload,
        },
      }
    }

    case 'SET_TARGET_FORMAT': {
      return {
        ...state,
        formatTypes: {
          ...state.formatTypes,
          target: action.payload,
        },
      }
    }

    case 'IMPORT_CONFIG': {
      return action.payload
    }
    case 'SET_STAGE': {
      return { ...state, stage: action.payload }
    }
    case 'SET_PROPERTY_DATA': {
      return {
        ...state,
        propertyData: action.payload,
      }
    }

    case 'SET_PROPERTY_DATA_NODES_EDGES': {
      return {
        ...state,
        propertyData: {
          ...state.propertyData,
          nodes: action.payload.nodes,
          edges: action.payload.edges,
        },
      }
    }

    default: {
      return state
    }
  }
}
