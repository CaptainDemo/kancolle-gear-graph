import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from '@xyflow/react';

interface LabeledEdgeData {
  kind?: string;
  label?: string;
  amount?: number;
  side?: 'left' | 'right';
  [key: string]: unknown;
}

/**
 * 自定义边：把 label 渲染在路径"远离中心节点"的一端。
 * LEFT 侧的边（target=中心）：label 靠近 source（25% 位置）
 * RIGHT 侧的边（source=中心）：label 靠近 target（75% 位置）
 * side 从 edge.data.side 取，由 graph.ts 在构造时填充。
 */
export function LabeledEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const edgeData = data as LabeledEdgeData | undefined;
  const isLeft = edgeData?.side === 'left';

  // 水平 handle（Left/Right）：label 远离中心节点
  //   LEFT 侧 → 25% (靠近 source)
  //   RIGHT 侧 → 75% (靠近 target)
  // 顶部/底部 handle（平行边扇形）：label 在曲线顶点（50%）
  //   此处 sourceX/targetX 是节点中线 X，midpoint 落在两节点间隙上方/下方
  const isHorizontalSource =
    sourcePosition === Position.Left || sourcePosition === Position.Right;

  let labelX: number;
  let labelY: number;
  if (isHorizontalSource) {
    labelX = sourceX + (targetX - sourceX) * (isLeft ? 0.3 : 0.7);
    labelY = isLeft ? sourceY : targetY;
  } else {
    // 平行边走顶部/底部曲线：smoothstep 在两端 handle 之外多走 20px 然后水平连接
    // 水平段 Y = 较高 handle 的 Y - 20（Top 时）/ 较低 handle 的 Y + 20（Bottom 时）
    // 把 label 放在水平段中央
    labelX = (sourceX + targetX) / 2;
    const isTopSide = sourcePosition === Position.Top || targetPosition === Position.Top;
    labelY = isTopSide
      ? Math.min(sourceY, targetY) - 20
      : Math.max(sourceY, targetY) + 20;
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="edge-label-edge"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            title={edgeData?.kind}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
