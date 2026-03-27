import { FLOW_KEY } from '~/utils/datamapper_utils/constant'

function AdvancedEditor() {
  const data = localStorage.getItem(FLOW_KEY)

  return (
    <div className="flex justify-center overflow-auto">
      <div className="flex w-full flex-col items-center px-4">
        <code className="bg-backdrop w-full rounded p-4 wrap-break-word whitespace-pre-wrap shadow select-text">
          {data ? JSON.stringify(JSON.parse(data), null, 2) : 'No data found'}
        </code>
      </div>
    </div>
  )
}

export default AdvancedEditor
