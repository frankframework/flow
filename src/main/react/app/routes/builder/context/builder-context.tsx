import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import useFrankDocStore from '~/stores/frank-doc-store'
import useNodeContextStore from '~/stores/node-context-store'
import {useReactFlow} from "@xyflow/react";
import useFlowStore from "~/stores/flow-store";

export default function BuilderContext({ onClose }: Readonly<{ onClose: () => void }>) {
  const { frankDocRaw, isLoading, error } = useFrankDocStore()
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)
  const nodes = useFlowStore((state) => state.nodes)

  const onDragStart = (value: { attributes: any[] }) => {
    return (event: {
      dataTransfer: { setData: (argument0: string, argument1: string) => void; effectAllowed: string }
    }) => {
      setAttributes(value.attributes)
      setNodeId(nodes.length)
      event.dataTransfer.setData('application/reactflow', JSON.stringify(value))
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  return (
    <div className="h-full">
      <div>
        <div className="flex h-12 items-center gap-1 px-4">
          <div className="text-xl">Palette</div>
          <div className="grow"></div>
          <SidebarIcon onClick={onClose} className="fill-gray-950 hover:fill-[var(--color-brand)]"></SidebarIcon>
        </div>
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
      </div>
      <div className="h-full overflow-y-auto">
        <ul className="p-4">
          {isLoading && <li>Loading...</li>}
          {error && <li>Error: {error}</li>}
          {!isLoading &&
            Object.entries(frankDocRaw?.elements).map(([key, value]: [string, any]) => (
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
