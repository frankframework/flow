import type { useFlowManagement } from '~/hooks/use-datamapper-flow-management'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'

//This function is responsible for creating testData and will be removed at some point in the future
export async function initFlowNodes(flow: ReturnType<typeof useFlowManagement>, config: MappingListConfig) {
  await flow.addNodeSequential('source', 'firstname', 'string', '')
  await flow.addNodeSequential('source', 'lastname', 'string', '')

  const groupNodeId = await flow.addNodeSequential('source', 'adress', 'object')

  await flow.addNodeSequential('source', 'postalcode', 'string', 'test', groupNodeId)

  await flow.addNodeSequential('source', 'house number', 'integer', null, groupNodeId)

  await flow.addNodeSequential(
    'source',
    'TestnUMBER Really longg item inside a list. please let this work it would be so annoying to',
    'integer',
    null,
    groupNodeId,
  )

  await flow.addNodeSequential('source', 'TestnUMBER2', 'integer', null, groupNodeId)

  await flow.addNodeSequential('source', 'phone number', 'integer', '')

  await flow.addNodeSequential(
    'source',
    'this is a very long line to make sure the spacing is being done correctly. Possibly it should be cut off but to be determined later...',
    'string',
  )

  for (let index = 0; index <= 10; index++) {
    await flow.addNodeSequential('target', `testTarget${index * 3}`, 'string')

    await flow.addNodeSequential('source', `testSource${index * 3}`, 'string')
  }

  await flow.addNodeSequential(
    'source',
    'this is a very long line to make sure the spacing is being done correctly. Possibly it should be cut off but to be determined later...',
    'string',
  )
}
