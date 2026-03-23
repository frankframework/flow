import { useState } from 'react'

import UploadImportButton from './upload-import-button'
import type { MappingListConfig } from '~/types/datamapper_types/export-types'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Input from '../inputs/input'
import Button from '../inputs/button'
import DeleteButton from './basic-components/delete-button'

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
      <DeleteButton
        onClick={() => {
          deleteSourceSchema(sourceName)
          onDelete()
        }}
      />
    </div>
  )
}

export default SourceDefinitionComponent
