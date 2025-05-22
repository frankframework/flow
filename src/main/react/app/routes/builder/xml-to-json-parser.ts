import type { FlowNode } from '~/routes/builder/canvas/flow'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'

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
  convertAdapterToFlowNodes(adapterList[0])

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
      for (const [exitId, exit] of exits.entries()) {
        nodes.push({
          id: index.toString() + exitId.toString(),
          type: 'Exit',
          name: exit.getAttribute('name') || '',
          children: [],
        })
      }
      continue
    }
    nodes.push({
      id: index,
      to: [],
      type: getElementTypeFromName(element.tagName),
      subtype: element.tagName,
      name: element.getAttribute('name') || '',
      children: element.children,
    })
  }

  console.log(elements)
}
