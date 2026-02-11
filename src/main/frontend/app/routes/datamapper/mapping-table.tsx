import { useState, useMemo, type Dispatch } from 'react'
import type { Node, Edge } from '@xyflow/react'
import AddMappingForm from '~/components/datamapper/forms/add-mapping-form'
import Modal from '~/components/modal'
import { showSuccessToast } from '~/components/toast'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import type { Mutation, Condition, MappingListConfig } from '~/types/datamapper_types/config-types'
import type { MappingNode, MappingConfig } from '~/types/datamapper_types/node-types'
import { getNodesByTypeAndId, createMappingNode, deleteMappingNode } from '~/utils/datamapper_utils/react-node-utils'

interface MappingRow {
  id: string
  sourcesNames: string[]
  targetsNames: string[]
  type: string
  mutations: Mutation[]
  conditions: Condition[]
  conditional: Condition | null
  outputLabel: string
}

function flowToMappingTable(nodes: Node[], edges: Edge[]): MappingRow[] {
  const nodeMap = new Map<string, Node>(nodes.map((node) => [node.id, node]))

  const getLabel = (nodeId: string): string => {
    const label = nodeMap.get(nodeId)?.data?.label
    return typeof label === 'string' ? label : nodeId
  }

  return nodes
    .filter((node): node is MappingNode => node.type === 'mappingNode')
    .map((mappingNode): MappingRow => {
      const incomingEdges = edges.filter((edge) => edge.target === mappingNode.id)
      const outgoingEdges = edges.filter((edge) => edge.source === mappingNode.id)

      const mutations = mappingNode.data?.mutations ?? []
      const conditions = mappingNode.data?.conditions ?? []
      const conditional = mappingNode.data?.conditional ?? null

      const outputLabel = (() => {
        const outputId = mappingNode.data?.output
        if (!outputId) return ''

        const mutation = mutations.find((mutation) => mutation.id === outputId)
        const condition = conditions.find((condition) => condition.id == outputId)
        return mutation?.name ?? condition?.name ?? getLabel(outputId)
      })()

      return {
        id: mappingNode.id,
        sourcesNames: incomingEdges.map((edge) => getLabel(edge.source)),
        targetsNames: outgoingEdges.map((edge) => getLabel(edge.target)),
        type: mappingNode.data?.type ?? 'one-to-one',
        mutations,
        conditions,
        conditional,
        outputLabel,
      }
    })
}

interface PropertyListProperties {
  config: MappingListConfig
  configDispatch: Dispatch<ConfigActions>
}

function MappingTable({ config, configDispatch }: PropertyListProperties) {
  const [refresh, setRefresh] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<MappingConfig | null>(null)

  const flow: { nodes?: Node[]; edges?: Edge[] } = useMemo(() => {
    return config.propertyData ?? {}
  }, [config.propertyData, refresh])

  const nodes: Node[] = flow.nodes || []
  const edges: Edge[] = flow.edges || []

  const sources = getNodesByTypeAndId(nodes, { typeIncludes: 'sourceOnly' })
  const targets = getNodesByTypeAndId(nodes, { typeIncludes: 'targetOnly' })

  const rows = useMemo(() => {
    if (nodes.length === 0 || edges.length === 0) return []
    return flowToMappingTable(nodes, edges)
  }, [nodes, edges])

  function saveMapping(mappingConfig: MappingConfig) {
    const { updatedNodes, updatedEdges } = createMappingNode(mappingConfig, nodes, edges)

    configDispatch({
      type: 'SET_PROPERTY_DATA_NODES_EDGES',
      payload: { nodes: updatedNodes, edges: updatedEdges },
    })

    setRefresh((count) => count + 1)
    setEditingMapping(null)
    setModalOpen(false)

    showSuccessToast('Mapping saved successfully!')
  }

  return (
    <div className="relative w-full p-4">
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <AddMappingForm sources={sources} targets={targets} initialData={editingMapping} onSave={saveMapping} />
      </Modal>

      {/* -------------------------------- Header -------------------------------- */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Mapping Table</h2>
        <button
          className="border-border bg-foreground-active text-foreground hover:bg-hover fixed right-20 rounded-2xl border px-4 py-2"
          onClick={() => {
            setEditingMapping(null)
            setModalOpen(true)
          }}
        >
          Add Mapping
        </button>
      </div>

      <div className="border-border w-full overflow-y-auto border p-4">
        <table className="bg-background w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-foreground-active">
              <th className="border px-3 py-2">Sources</th>
              <th className="border px-3 py-2">Targets</th>
              <th className="border px-3 py-2">Mutations</th>
              <th className="border px-3 py-2">Conditions</th>
              <th className="border px-3 py-2">Conditional</th>
              <th className="border px-3 py-2">Output</th>
              <th className="w-30 border px-3 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-hover">
                {/* Sources */}
                <td className="border px-3 py-2 align-top">
                  {row.sourcesNames.map((source, index) => (
                    <div key={index} className="text-2xl">
                      {source}
                    </div>
                  ))}
                </td>

                {/* Targets */}
                <td className="border px-3 py-2 align-top">
                  {row.targetsNames.map((target, index) => (
                    <div key={index} className="text-2xl">
                      {target}
                    </div>
                  ))}
                </td>

                {/* Mutations */}
                <td className="border px-3 py-2 align-top">
                  {row.mutations.map((mutation, index) => (
                    <div key={index} className="leading-tight">
                      <span className="text-xl">{mutation.name}</span>{' '}
                      <span className="text-foreground-muted text-xl">(Type: {mutation.mutationType?.name})</span>
                    </div>
                  ))}
                </td>
                {/* Conditions */}
                <td className="border px-3 py-2 align-top">
                  {row.conditions.map((condition, index) => (
                    <div key={index} className="leading-tight">
                      <span className="text-xl">{condition.name}</span>{' '}
                      <span className="text-foreground-muted text-xl">(Type: {condition.type?.name})</span>
                    </div>
                  ))}
                </td>
                {/* Conditional */}

                <td className="border px-3 py-2 align-top text-2xl">
                  {row.conditional ? (
                    <>
                      <span className="text-xl">{row.conditional.name}</span>{' '}
                      <span className="text-foreground-muted text-xl">(Type: {row.conditional?.type?.name})</span>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                {/* Output */}
                <td className="border px-3 py-2 align-top text-2xl">{row.outputLabel || '—'}</td>

                {/* Actions */}
                <td className="border px-3 py-2 align-top">
                  <button
                    className="px-1 text-3xl hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation()
                      const mappingNode = nodes.find((node) => node.id === row.id)
                      setEditingMapping((mappingNode?.data as MappingConfig) ?? null)
                      setModalOpen(true)
                    }}
                  >
                    ✏️
                  </button>

                  <button
                    className="px-1 text-4xl font-bold text-[var(--color-error)] hover:opacity-80"
                    onClick={() => {
                      const { remainingNodes, remainingEdges } = deleteMappingNode(row.id, nodes, edges)

                      configDispatch({
                        type: 'SET_PROPERTY_DATA_NODES_EDGES',
                        payload: {
                          nodes: remainingNodes,
                          edges: remainingEdges,
                        },
                      })

                      setRefresh((count) => count + 1)
                    }}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MappingTable
