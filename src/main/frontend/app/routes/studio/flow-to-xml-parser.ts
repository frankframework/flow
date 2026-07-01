import type { FlowNode } from '~/routes/studio/canvas/flow'
import type { Edge } from '@xyflow/react'
import type { ChildNode } from './canvas/nodetypes/child-node'
import { getAdapter } from '~/services/adapter-service'
import { FlowConfig } from './canvas/flow.config'
import { isGroupNode, isFrankNode, isStickyNote } from '~/stores/flow-store'
import type { GroupNode } from './canvas/nodetypes/group-node'

type ReactFlowJson = {
  nodes: FlowNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

type NodeData = {
  subtype: string
  type: string
  name: string
  attributes?: Record<string, string>
  sourceHandles?: []
  children?: ChildNode[]
  hiddenForwards?: boolean
}

function hasDataProperty(node: FlowNode): node is Extract<FlowNode, { data: NodeData }> {
  return (node as FlowNode).data != undefined
}

function escapeXml(string_: string): string {
  return string_.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export async function exportFlowToXml(
  json: ReactFlowJson,
  projectName: string,
  configurationPath: string,
  adapterName: string,
  existingAdapterXml?: string,
): Promise<string> {
  const adapterXml: string =
    existingAdapterXml === undefined
      ? await getAdapter(projectName, adapterName, configurationPath).then((response) => response.xmlContent)
      : existingAdapterXml
  const adapterAttributes = getAdapterAttributes(adapterXml)

  const { nodes, edges } = json
  const validNodes = nodes.filter((node) => hasDataProperty(node))
  const nodeMap = new Map(validNodes.map((n) => [n.id, n]))

  const { outgoing, incoming, edgeMap } = buildEdgeMaps(edges)

  const receiverNodes = validNodes.filter((n) => n.data.type?.toLowerCase() === 'receiver')
  const startNodes = receiverNodes.filter((n) => !incoming[n.id])
  let sortedIds: string[]
  if (startNodes.length > 0) {
    sortedIds = topologicalSort(
      startNodes.map((n) => n.id),
      outgoing,
    )

    const sortedSet = new Set(sortedIds)
    const unconnectedIds = validNodes.map((n) => n.id).filter((id) => !sortedSet.has(id))
    sortedIds = [...sortedIds, ...unconnectedIds]
  } else {
    sortedIds = validNodes.map((node) => node.id)
  }

  const exitNodes = validNodes.filter((n) => n.data.type?.toLowerCase() === 'exit')
  const exitNodeIds = new Set(exitNodes.map((n) => n.id))

  const receivers: string[] = []
  const pipelineParts: string[] = []

  for (const id of sortedIds) {
    const node = nodeMap.get(id)
    if (!node) continue

    const type = node.data.type?.toLowerCase()
    if (type === 'receiver') {
      receivers.push(generateXmlElement(node, edgeMap, exitNodeIds, nodeMap))
    } else if (type === 'pipe') {
      pipelineParts.push(generateXmlElement(node, edgeMap, exitNodeIds, nodeMap))
    }
  }

  const exitsXml = exitNodes.length > 0 ? `      <Exits>\n${generateExitsXml(exitNodes)}\n      </Exits>` : ''
  const flowXml = generateFlowElementsXml(nodes)

  return `
  <Adapter ${adapterAttributes}>
${receivers.join('\n')}
    <Pipeline>
${exitsXml}
${pipelineParts.join('\n')}
    </Pipeline>
    ${flowXml}
  </Adapter>`
}

export function replaceAdapterInXml(configXml: string, adapterIndex: number, newAdapterXml: string): string {
  const matches = [...configXml.matchAll(/<(Adapter|adapter)\b/g)]

  if (adapterIndex >= matches.length) return configXml

  const match = matches[adapterIndex]
  const start = match.index
  const closingTag = `</${match[1]}>`
  const closeIndex = configXml.indexOf(closingTag, start)
  if (closeIndex === -1) return configXml

  return configXml.slice(0, start) + newAdapterXml + configXml.slice(closeIndex + closingTag.length)
}

function buildEdgeMaps(edges: Edge[]) {
  const outgoing: Record<string, string[]> = {}
  const incoming: Record<string, string[]> = {}
  const edgeMap = new Map<string, { targetId: string; label: string }[]>()

  for (const edge of edges) {
    if (!outgoing[edge.source]) outgoing[edge.source] = []
    if (!incoming[edge.target]) incoming[edge.target] = []
    outgoing[edge.source].push(edge.target)
    incoming[edge.target].push(edge.source)

    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, [])
    edgeMap.get(edge.source)!.push({
      targetId: edge.target,
      label:
        typeof edge.data === 'object' && edge.data && 'label' in edge.data && typeof edge.data.label === 'string'
          ? edge.data.label
          : 'success',
    })
  }

  return { outgoing, incoming, edgeMap }
}

function getAdapterAttributes(adapterXml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(adapterXml, 'application/xml')
  const adapterElement = doc.documentElement
  return [...adapterElement.attributes].map((attr) => `${attr.name}="${attr.value}"`).join(' ')
}

function topologicalSort(startNodes: string[], outgoing: Record<string, string[]>): string[] {
  const visited = new Set<string>()
  const sorted: string[] = []

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    for (const target of outgoing[nodeId] || []) {
      dfs(target)
    }
    sorted.push(nodeId)
  }

  for (const startId of startNodes) {
    dfs(startId)
  }

  return sorted.toReversed()
}

function generateXmlElement(
  node: FlowNode,
  edgeMap: Map<string, { targetId: string; label: string }[]>,
  exitNodeIds: Set<string>,
  nodeMap: Map<string, FlowNode>,
): string {
  const { subtype, name } = node.data as NodeData
  const { x, y } = node.position
  const roundedX = Math.round(x)
  const roundedY = Math.round(y)

  const width = node.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH
  const height: number | null = node.height ?? null
  const attributes = (node.data as NodeData).attributes || {}
  const children = (node.data as NodeData).children || []

  const allAttrs: Record<string, string> = {
    ...attributes,
    name,
    'flow:x': String(roundedX),
    'flow:y': String(roundedY),
    ...(height === null ? {} : { 'flow:width': String(width), 'flow:height': String(height) }),
    ...((node.data as NodeData).hiddenForwards ? { 'flow:hiddenForwards': 'true' } : {}),
  }
  const attrStr = Object.entries(allAttrs)
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(' ')

  const childXml = children.map((child: ChildNode) => generateChildXml(child, 4)).join('\n')

  const type = (node.data as NodeData).type?.toLowerCase()

  const seenForwards = new Set<string>()
  const forwards =
    type === 'receiver'
      ? '' // Receivers should never have a <Forward> element
      : (edgeMap.get(node.id) || [])
          .map(({ label, targetId }) => {
            const forwardTarget = nodeMap.get(targetId)
            const targetName = (forwardTarget?.data as NodeData)?.name || ''

            if (targetName === '') {
              console.warn(`Target node with ID ${targetId} does not have a name attribute.`)
              return ''
            }

            const key = `${label}:${targetName}`
            if (seenForwards.has(key)) return ''
            seenForwards.add(key)

            return `    <Forward name="${escapeXml(label)}" path="${escapeXml(targetName)}" />`
          })
          .join('\n')

  const content = [childXml, forwards].filter(Boolean).join('\n')
  return content ? `  <${subtype} ${attrStr} >\n${content}\n  </${subtype}>` : `  <${subtype} ${attrStr} />`
}

function generateChildXml(child: ChildNode, indent: number): string {
  const spaces = ' '.repeat(indent)

  const childAttrs: Record<string, string> = {
    ...(child.name ? { name: child.name } : {}),
    ...child.attributes,
  }

  const attrStr = Object.entries(childAttrs)
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(' ')

  const attrs = attrStr ? ` ${attrStr}` : ''
  const hasChildren = child.children && child.children.length > 0

  if (!hasChildren) {
    return `${spaces}<${child.subtype}${attrs}/>`
  }

  const childXmlStrings = child.children!.map((nested) => generateChildXml(nested, indent + 2))

  return `${spaces}<${child.subtype}${attrs}>
${childXmlStrings.join('\n')}
${spaces}</${child.subtype}>`
}

function generateExitsXml(exitNodes: FlowNode[]): string {
  return exitNodes
    .map((node) => {
      const { name } = node.data as NodeData
      const data = node.data as NodeData
      const { x, y } = node.position
      const roundedX = Math.round(x)
      const roundedY = Math.round(y)
      let width = FlowConfig.EXIT_DEFAULT_WIDTH
      let height = FlowConfig.EXIT_DEFAULT_HEIGHT
      if (node.measured && node.measured.width && node.measured.height) {
        width = node.measured.width
        height = node.measured.height
      }

      const allAttrs: Record<string, string> = {
        ...data.attributes,
        name,
        'flow:x': String(roundedX),
        'flow:y': String(roundedY),
        'flow:width': String(width),
        'flow:height': String(height),
      }
      const attrStr = Object.entries(allAttrs)
        .map(([k, v]) => `${k}="${escapeXml(v)}"`)
        .join(' ')

      return `      <Exit ${attrStr} />`
    })
    .join('\n')
}

function generateFlowElementsXml(nodes: FlowNode[]): string {
  const stickyNotes = nodes.filter((node) => isStickyNote(node))
  const groupNodes = nodes.filter((node) => isGroupNode(node))

  const groupChildrenMap = new Map<string, FlowNode[]>()

  for (const node of nodes) {
    if (!node.parentId) continue

    if (!groupChildrenMap.has(node.parentId)) {
      groupChildrenMap.set(node.parentId, [])
    }

    groupChildrenMap.get(node.parentId)!.push(node)
  }

  const stickyXml = stickyNotes.map((stickynote) => {
    const { x, y } = stickynote.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    const text = stickynote.data?.content || ''
    const color = stickynote.data?.color
    const colorAttr = color ? ` flow:color="${escapeXml(color)}"` : ''

    let width: number
    let height: number

    if (stickynote.data?.collapsed) {
      width = stickynote.data.preCollapseWidth ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
      height = stickynote.data.preCollapseHeight ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
    } else {
      width = stickynote.measured?.width ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
      height = stickynote.measured?.height ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
    }

    const collapsedAttr = stickynote.data?.collapsed === true ? ` flow:collapsed="true"` : ''

    let attachedToAttr = ''
    if (stickynote.data?.attachedToNodeId) {
      const frankNode = nodes.find((node) => isFrankNode(node) && node.id === stickynote.data.attachedToNodeId)
      if (frankNode && isFrankNode(frankNode)) {
        attachedToAttr = ` flow:attachedTo="${escapeXml(frankNode.data.name)}"`
      }
    }

    return `    <flow:StickyNote${colorAttr} flow:x="${roundedX}" flow:y="${roundedY}" flow:width="${width}" flow:height="${height}"${collapsedAttr}${attachedToAttr}><![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]></flow:StickyNote>`
  })

  const groupNodesXml = generateGroupNodeXml(groupNodes, groupChildrenMap)

  const allElements = [...stickyXml, ...groupNodesXml]

  if (allElements.length === 0) return ''

  return `
  <flow:FlowElements>
${allElements.join('\n')}
  </flow:FlowElements>`
}

function generateGroupNodeXml(groupNodes: GroupNode[], groupChildrenMap: Map<string, FlowNode[]>): string[] {
  return groupNodes.map((groupNode) => {
    const { x, y } = groupNode.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    const width = groupNode.measured?.width || FlowConfig.NODE_DEFAULT_WIDTH
    const height = groupNode.measured?.height || FlowConfig.NODE_MIN_HEIGHT

    const children = groupChildrenMap.get(groupNode.id) || []

    const childNames = children
      .map((child) => (child.data as NodeData)?.name)
      .filter((name) => name && name.trim() !== '')
      .map((name) => escapeXml(name))
      .join(',')

    const groupName = escapeXml(groupNode.data?.label || '')

    const attrParts = [
      `flow:children="${childNames}"`,
      `flow:height="${height}"`,
      `flow:width="${width}"`,
      `flow:x="${roundedX}"`,
      `flow:y="${roundedY}"`,
      `flow:label="${groupName}"`,
    ]

    if (groupNode.data?.description) {
      attrParts.push(`flow:description="${escapeXml(groupNode.data.description)}"`)
    }

    if (groupNode.data?.color) {
      attrParts.push(`flow:color="${escapeXml(groupNode.data.color)}"`)
    }

    return `    <flow:GroupNode ${attrParts.join(' ')} />`
  })
}
