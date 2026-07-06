import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { AggregateNodeData } from '../../data/graph';
import { useStore } from '../../store/useStore';

export function AggregateNode({ id, data }: NodeProps) {
  const toggleAggregate = useStore((s) => s.toggleAggregate);

  if (data.kind !== 'aggregate') return null;
  const d = data as AggregateNodeData;
  const side = d.side;

  return (
    <div
      className="aggregate-node"
      title={`点击展开剩余 ${d.count} 个邻居`}
      onClick={(e) => {
        e.stopPropagation();
        toggleAggregate(id);
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />
      <span className="agg-plus">+</span>
      <span className="agg-count">{d.count}</span>
      <span className="agg-label">{side === 'left' ? '上游' : '下游'}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
    </div>
  );
}
