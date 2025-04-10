import {NodeResizeControl, type Node, type NodeProps, Handle, Position} from '@xyflow/react';
import {useLayoutEffect, useRef, useState} from "react";

export type ChildNode = {
  subtype: string;
  type: string;
  name?: string;
  attributes?: Record<string, string>;
};

export type FrankNode = Node<
        {
          subtype: string;
          type: string;
          name: string;
          srcHandleAmount: number,
          attributes?: Record<string, string>
          children: ChildNode[]
        }
>;

export function translateTypeToColor (type: string): string {
  switch (type.toLowerCase()) {
    case 'pipe':
      return '#68D250'
    case 'listener':
      return '#D250BF'
    case 'receiver':
      return '#D250BF'
    case 'sender':
      return '#30CCAF'
    case 'exit':
      return '#E84E4E'
    default:
      return '#FDC300'
  }
}

export default function FrankNode(props: NodeProps<FrankNode>) {

  const minNodeWidth = 300;
  const minNodeHeight = 200;
  const bgColor = translateTypeToColor(props.data.type);

  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(minNodeHeight);
  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  });

  useLayoutEffect(() => {
    if (containerRef.current) {
      const measuredHeight = containerRef.current.offsetHeight;
      setContentHeight(Math.max(minNodeHeight, measuredHeight));
    }
  }, [props.data.children]); // Re-measure when children change

  return (
          <>
            <NodeResizeControl minWidth={minNodeWidth}
                               minHeight={contentHeight}
                               onResize={(event, data) => {
                                 setDimensions({width: data.width, height: data.height});
                               }}
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
                   width: `${dimensions.width}px`
                 }}
                 ref={containerRef}
            >
              <div className="w-full p-1 box-border rounded-t-md"
                   style={{background: `linear-gradient(172deg, ${bgColor} 0%, #fff 75%, #fff 100%)`}}
              >
                <h1 className="font-bold">{props.data.subtype}</h1>
                <p className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap tracking-wider">{props.data.name.toUpperCase()}</p>
              </div>
              {props.data.attributes && Object.entries(props.data.attributes).map(([key, value]) =>
                      <div className="px-1 my-1 w-full max-w-full">
                        <p className="text-sm text-gray-500 overflow-hidden overflow-ellipsis whitespace-nowrap">{key}</p>
                        <p className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap">{value}</p>
                      </div>
              )}
              {props.data.children.length > 0 ?
                      <div className="bg-white w-[80%] border-gray-200 rounded-md p-2 m-2 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
                        {props.data.children.map((child) =>
                                <div className="bg-white border-1 border-gray-200 rounded-md max-w-max mb-1"
                                     style={{minHeight: `${minNodeHeight / 2}px`}}
                                >
                                  <div className="w-full p-1 box-border rounded-t-md"
                                       style={{background: `linear-gradient(172deg, ${translateTypeToColor(child.type)} 0%, #fff 75%, #fff 100%)`}}
                                  >
                                    <h1 className="font-bold">{child.subtype}</h1>
                                    <p className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap tracking-wider">{child.name?.toUpperCase()}</p>
                                  </div>
                                  {child.attributes && Object.entries(child.attributes).map(([key, value]) =>
                                          <div className="px-1 my-1">
                                            <p className="text-sm text-gray-500 overflow-hidden overflow-ellipsis whitespace-nowrap">{key}</p>
                                            <p className="text-sm overflow-hidden overflow-ellipsis whitespace-nowrap">{value}</p>
                                          </div>
                                  )}
                                </div>
                        )}
                      </div>
                      :
                      <></>
              }
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
            <Handle
                    key="1"
                    type="source"
                    position={Position.Right}
                    className="text-white flex items-center justify-center"
                    style={{
                      right: '-10px',
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#3079CC'
                    }}> {/* Use inline styling to prevent ReactFlow override on certain properties */}
              <HandleIcon/>
            </Handle>
          </>
  )
}

export function ResizeIcon() {
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

export function HandleIcon() {
  return (
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
  )
}
