import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import useFrankDocStore from '~/stores/frank-doc-store'
import useNodeContextStore from '~/stores/node-context-store'
import useFlowStore from '~/stores/flow-store'

export default function BuilderContext() {
  const { frankDocRaw, isLoading, error } = useFrankDocStore()
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)

  const onDragStart = (value: { attributes: any[] }) => {
    return (event: {
      dataTransfer: { setData: (argument0: string, argument1: string) => void; effectAllowed: string }
    }) => {
      setAttributes(value.attributes)
      setNodeId(+useFlowStore.getState().nodeIdCounter)
      event.dataTransfer.setData('application/reactflow', JSON.stringify(value))
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative px-4">
        <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
          <MagnifierIcon className="h-auto w-4 fill-gray-400" />
        </label>
        <input
          id="search"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-1 pr-4 pl-7"
          type="search"
          placeholder="Search"
        />
      </div>
      <div className="h-full overflow-y-auto">
        <ul className="p-4">
          {isLoading && <li>Loading...</li>}
          {error && <li>Error: {error}</li>}
          {!isLoading &&
            Object.entries(frankDocRaw?.elements).map(([, value]: [string, any]) => (
              <li
                className="m-2 cursor-move rounded border border-gray-400 p-4"
                key={value.name}
                draggable
                onDragStart={onDragStart(value)}
              >
                {value.name}
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
