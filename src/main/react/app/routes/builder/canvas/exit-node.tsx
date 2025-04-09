import {Handle, type NodeProps, NodeResizeControl, Position} from "@xyflow/react";
import {type FrankNode, HandleIcon, ResizeIcon, translateTypeToColor} from "~/routes/builder/canvas/frank-node";

export default function ExitNode(props: NodeProps<FrankNode>) {

  const minNodeWidth = 150;
  const minNodeHeight = 100;

  return (
          <>
            <NodeResizeControl minWidth={minNodeWidth}
                               minHeight={minNodeHeight}
                               style={{
                                 background: "transparent",
                                 border: "none"
                               }}> {/* Use inline styling to prevent ReactFlow override on certain properties */}
              <ResizeIcon/>
            </NodeResizeControl>
            <div className="bg-white h-full border-1 border-gray-200 rounded-md flex flex-col items-center"
                 style={{
                   minHeight: `${minNodeHeight}px`,
                   minWidth: `${minNodeWidth}px`,
                 }}
            >
              <div className="w-full p-1 box-border rounded-t-md"
                   style={{background: `linear-gradient(172deg, ${translateTypeToColor(props.data.type)} 0%, #fff 75%, #fff 100%)`}}
              >
                <h1 className="font-bold">{props.data.subtype}</h1>
                <p className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap tracking-wider">{props.data.name.toUpperCase()}</p>
              </div>
            </div>
            <Handle type="target" position={Position.Left}
                    className="text-white flex items-center justify-center"
                    style={{
                      left: '-10px',
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#3079CC'
                    }}> {/* Use inline styling to prevent ReactFlow override on certain properties */}
              <HandleIcon/>
            </Handle>
          </>
  )
}
