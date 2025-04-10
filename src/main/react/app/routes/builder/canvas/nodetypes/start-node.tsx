import {Handle, type Node, Position} from "@xyflow/react";

export type StartNode = Node<{}>
export default function StartNode(){

  return (
          <>
            <div className="rounded-full w-[10px] h-[10px] bg"
                 style={{ backgroundColor: '#3079CC' }}
            >
            </div>
            <Handle type={"source"} position={Position.Right} className="invisible">
            </Handle>
          </>
  )
}
