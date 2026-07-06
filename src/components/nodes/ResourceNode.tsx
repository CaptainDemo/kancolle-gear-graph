import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { ResourceNodeData } from '../../data/graph';
import { RESOURCE_META } from '../../lib/constants';

export function ResourceNode({ data }: NodeProps) {
  const d = data as ResourceNodeData;
  const meta = RESOURCE_META[d.resourceKey];
  return (
    <div
      className="resource-leaf"
      style={{ background: meta.color, borderColor: meta.color }}
      title={`${meta.label}: ${d.amount}`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
      <div className="resource-char">{meta.label}</div>
      <div className="resource-amount">{d.amount}</div>
    </div>
  );
}
