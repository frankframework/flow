import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Position,
  useReactFlow,
} from '@xyflow/react';

interface FrankEdgeProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  data: { label: string };
  type: string;
}

export default function FrankEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: FrankEdgeProps) {
  const { setEdges } = useReactFlow();
  const [ edgePath, labelX, labelY] = getBezierPath({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition});

  return (
          <>
            <BaseEdge id={id} path={edgePath}/>
            <EdgeLabelRenderer>
              <p style={{
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 15}px)`,
              }}
                 className="absolute pointer-events-auto bg-white px-1 text-sm">{data.label}</p>
            </EdgeLabelRenderer>
          </>
  );
}
