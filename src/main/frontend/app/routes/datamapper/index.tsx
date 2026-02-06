import React from 'react'

import { ReactFlowProvider } from '@xyflow/react'
import { Toast } from '~/components/datamapper/Toast'

import { FileProvider } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import Root from './Root'

export default function App() {
  return (
    <ReactFlowProvider>
      <FileProvider>
        <Root />
        <Toast />
      </FileProvider>
    </ReactFlowProvider>
  )
}
