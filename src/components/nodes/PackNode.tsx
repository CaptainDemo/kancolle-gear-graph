import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { PackNodeData } from '../../data/graph';
import { RESOURCE_META } from '../../lib/constants';
import type { ResourceKey } from '../../lib/constants';

const ORDER: ResourceKey[] = ['fuel', 'ammo', 'steel', 'bauxite', 'screw', 'devmat'];

export function PackNode({ data }: NodeProps) {
  if (data.kind !== 'pack') return null;
  const d = data as PackNodeData;
  const isImprove = d.packKind === 'improve';
  const label = isImprove ? '改修素材' : '进化素材';
  const color = isImprove ? '#90a4ae' : '#78909c';

  const entries = ORDER.map((k) => ({
    key: k,
    amount: d.stats[k] ?? 0,
    meta: RESOURCE_META[k],
  })).filter((e) => e.amount > 0);

  return (
    <div
      className="pack-node"
      title={`${label}（点击${d.expanded ? '收起' : '展开'}明细）`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
      <div className="pack-title" style={{ color }}>
        {label} {d.expanded ? '▾' : '▸'}
      </div>
      {!d.expanded && (
        <div className="pack-compact">
          {entries.map((e) => (
            <span key={e.key} className="pack-tiny">
              <span className="pack-tiny-char" style={{ color: e.meta.color }}>
                {e.meta.label}
              </span>
              <span className="pack-tiny-num">{e.amount}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
