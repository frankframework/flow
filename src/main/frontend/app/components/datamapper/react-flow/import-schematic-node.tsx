import { Handle, Position } from '@xyflow/react'

import { GROUP_WIDTH } from '~/utils/datamapper_utils/constant'

import NewUploadImportButton from '../new-upload-import-button'
import type { ImportSchematicFunc } from '~/hooks/use-datamapper-flow-management'
//DataType needed
export interface ImportSchematicNodeprops {
  data: {
    fileType: string
    side: 'source' | 'target'
    importFunc: ImportSchematicFunc
  } & Record<string, unknown>
}

function ImportSchematicNode({ data }: ImportSchematicNodeprops) {
  return (
    <div
      className="group cap-3 block h-full rounded-xl border-3 border-dashed p-3 shadow"
      style={{ width: `${GROUP_WIDTH}px` }}
    >
      {/* Header */}
      <div className="flex text-3xl">Test</div>

      <NewUploadImportButton
        fileType={data.fileType}
        importFunc={(file: File) => data.importFunc(file, data.side, file.name)}
      />

      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
export default ImportSchematicNode
