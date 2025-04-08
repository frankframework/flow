import {NodeResizeControl, type Node, type NodeProps, Handle, Position} from '@xyflow/react';
import {useState} from "react";

export type FrankNode = Node<
        {
          subtype: string;
          type: string;
          name: string;
          amountOfEdges: number,
        }
>;

export default function FrankNode(props: NodeProps<FrankNode>) {

  const minNodeWidth = 200;
  const minNodeHeight = 120;

  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  });

  return (
          <>
            <NodeResizeControl minWidth={minNodeWidth}
                               minHeight={minNodeHeight}
                               onResize={(event, data) => {
                                 setDimensions({width: data.width, height: data.height});
                               }}
                               style={{ background: "transparent",  border: "none" }}> {/* Use inline styling to prevent ReactFlow override on certain properties */}
              <ResizeIcon/>
            </NodeResizeControl>
            <div className="bg-white h-full border-1 border-gray-200 rounded-md"
                 style={{minHeight: `${minNodeHeight}px`, minWidth: `${minNodeWidth}px`}}>
              <div className="w-full bg-linear-to-br from-yellow-400 to-white px-0.5 py-1 ">
                <h1>{props.data.subtype}</h1>
              </div>
            </div>
            <Handle type="target" position={Position.Left}
                    className="text-white"
                    style={{ left: '-10px', width: '10px', height: '10px', backgroundColor: '#3079CC' }}> {/* Use inline styling to prevent ReactFlow override on certain properties */}
              <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      style={{pointerEvents: 'none'}}
              >
                <polyline
                        points="4,3 6,5 4,7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
              </svg>
            </Handle>
            <Handle
                    key="1"
                    type="source"
                    position={Position.Right}
                    className="text-white"
                    style={{right: '-10px', width: '10px', height: '10px', backgroundColor: '#3079CC' }}> {/* Us inline styling to prevent ReactFlow override on certain properties */}
              <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{pointerEvents: 'none'}}
              >
                <polyline
                        points="4,3 6,5 4,7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
              </svg>
            </Handle>
          </>
  )
}

function ResizeIcon() {
  return (
          <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="#999999"
                  strokeLinecap="round"
                  className={"absolute right-[5px] bottom-[5px]"}
          >
            <line x1="19" y1="20" x2="20" y2="19"/>
            <line x1="14" y1="20" x2="20" y2="14"/>
            <line x1="9" y1="20" x2="20" y2="9"/>
          </svg>
  )
}
