import { useState } from 'react'

import UploadImportButton from './upload-import-button'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'

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
      <input
        id="sourcePath"
        value={sourceName}
        onChange={(e) => setSourceName(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        disabled={confirmed}
      />
      <button
        className="border-border bg-backdrop text-foreground hover:bg-hover active:bg-selected disabled:bg-backdrop disabled:text-foreground-muted w-full rounded-lg border px-3 py-2.5 text-sm font-medium"
        disabled={sourceName.length === 0}
        hidden={confirmed}
        onClick={() => setConfirmed(true)}
      >
        Confirm Name
      </button>
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
