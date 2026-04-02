import { Handle, Position } from '@xyflow/react'

import { GROUP_WIDTH } from '~/utils/datamapper_utils/constant'

import ImportButton from '../basic-components/import-button'
import type { ImportSchematicFunc } from '~/hooks/use-datamapper-flow-management'
import CodeFile from '/icons/solar/Code File.svg?react'
import { useState } from 'react'
import clsx from 'clsx'
import { showErrorToast } from '~/components/toast'

//DataType needed
export interface ImportSchematicNodeprops {
  data: {
    fileType: string
    side: 'source' | 'target'
    importFunc: ImportSchematicFunc
  } & Record<string, unknown>
}

function ImportSchematicNode({ data }: ImportSchematicNodeprops) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  return (
    <div
      className={clsx(
        'group cap-3 flex h-full flex-col items-center rounded-xl border-dashed border-gray-400 p-3 shadow',
        isDragging || file ? 'bg-selected border! border-solid' : 'border-2',
      )}
      style={{ width: `${GROUP_WIDTH}px` }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file.name.endsWith(data.fileType)) setFile(file)
        else showErrorToast(file.name, 'Incorrect filetype!')
      }}
    >
      {/* Header */}
      <div className="flex text-xl">Import schema</div>
      <CodeFile className={clsx('fill-foreground m-5 flex h-10 w-10')} />

      <ImportButton
        fileType={data.fileType}
        file={file}
        setFile={setFile}
        importFunc={(file: File) => data.importFunc(file, data.side, file.name.replace(data.fileType, ''))}
      />

      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
export default ImportSchematicNode
