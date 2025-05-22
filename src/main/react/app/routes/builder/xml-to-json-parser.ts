import type { FlowNode } from '~/routes/builder/canvas/flow'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'
import type { ExitNode } from '~/routes/builder/canvas/nodetypes/exit-node'
import type { FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'

export async function getXmlString(filename: string): Promise<string> {
  try {
    const response = await fetch(`/configurations/${filename}`)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const xmlString = await response.text()
    return xmlString
  } catch (error) {
    throw new Error(`Failed to fetch XML file: ${error}`)
  }
}

export async function convertXmlToJson(filename: string) {
  const xmlString = await getXmlString(filename)
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

  const adapterList = xmlDoc.querySelectorAll('Adapter')
  convertAdapterToFlowNodes(adapterList[2])

  return 'adapterJsonList'
}

function convertAdapterToFlowNodes(adapter: any): FlowNode[] {
  let elements: Element[] = []
  let nodes: FlowNode[] = []

  const receiverElements = adapter.querySelectorAll('Adapter > Receiver')
  for (const receiver of receiverElements) elements.push(receiver)

  const pipelineElement = adapter.querySelector('Pipeline')
  let firstPipeName = null
  if (pipelineElement) {
    firstPipeName = pipelineElement.getAttribute('firstPipe')
  }
  if (pipelineElement) {
    // If a first pipe is specified within the pipeline, insert that pipe to the front
    if (firstPipeName) {
      let pipeArray = [...pipelineElement.children]

      const firstPipeIndex = pipeArray.findIndex((pipe) => pipe.getAttribute('name') === firstPipeName)

      if (firstPipeIndex !== -1) {
        // Ensure the element exists
        const [firstPipe] = pipeArray.splice(firstPipeIndex, 1) // Remove from original spot
        pipeArray.unshift(firstPipe) // Insert at the front
      }

      elements.push(...pipeArray)
    } else {
      elements.push(...pipelineElement.children)
    }
  }

  for (const [index, element] of elements.entries()) {
    if (element.tagName === 'Exits') {
      const exits = [...element.children]
      console.log(exits)
      for (const [exitId, exit] of exits.entries()) {
        const exitNode: ExitNode = {
          id: index.toString() + exitId.toString(),
          type: 'exitNode',
          position: { x: 0, y: 0 },
          data: {
            name: exit.getAttribute('name') || '',
            type: 'Exit',
            subtype: 'Exit',
          },
        }
        nodes.push(exitNode)
      }
      continue
    }
    const frankNode: FrankNode = {
      id: index.toString(),
      type: 'frankNode',
      position: { x: 0, y: 0 },
      data: {
        name: element.getAttribute('name') || '',
        type: getElementTypeFromName(element.tagName),
        subtype: element.tagName,
        children: [],
        sourceHandles: [
          {
            type: 'success',
            index: 1,
          },
        ],
      },
    }
    nodes.push(frankNode)
  }

  console.log(nodes)
}
