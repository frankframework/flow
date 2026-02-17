import { useState } from 'react'

import UploadImportButton from './upload-import-button'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Input from '../inputs/input'
import Button from '../inputs/button'

interface SourceDefinitionComponentProperties {
  config?: MappingListConfig
  onDelete: () => void
}

function SourceDefinitionComponent({ config, onDelete }: SourceDefinitionComponentProperties) {
  const { deleteSourceSchema } = useFile()
  const [sourceName, setSourceName] = useState('')

  const [confirmed, setConfirmed] = useState<boolean>(false)
  return (
    <div className="bg-background relative mt-3 flex flex-col gap-3 rounded-lg border p-3 shadow">
      <label htmlFor="sourcePath">Name:</label>
      <Input
        id="sourcePath"
        value={sourceName}
        onChange={(event) => {
          setSourceName(event.target.value)
        }}
        disabled={confirmed}
      />
      <Button disabled={sourceName.length === 0} hidden={confirmed} onClick={() => setConfirmed(true)}>
        Confirm Name
      </Button>
      <div hidden={!confirmed}>
        <UploadImportButton
          label="Import Schema"
          flowType="source"
          config={config}
          name={sourceName}
          disabled={!confirmed}
        />
      </div>
      <button
        className="absolute top-2 right-2 text-3xl font-bold text-red-600 hover:text-red-700 hover:opacity-80"
        onClick={() => {
          deleteSourceSchema(sourceName)
          onDelete()
        }}
      >
        &times;
      </button>
    </div>
  )
}

export default SourceDefinitionComponent
