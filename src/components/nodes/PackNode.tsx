import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { PackNodeData } from '../../data/graph';
import { RESOURCE_META } from '../../lib/constants';
import type { ResourceKey } from '../../lib/constants';

const ORDER: ResourceKey[] = ['fuel', 'ammo', 'steel', 'bauxite', 'screw', 'devmat'];

const PACK_META: Record<PackNodeData['packKind'], { label: string; color: string }> = {
  improve: { label: '改修素材', color: '#90a4ae' },
  evolve: { label: '进化素材', color: '#78909c' },
  develop: { label: '开发理论值', color: '#8d6e63' },
};

export function PackNode({ data }: NodeProps) {
  if (data.kind !== 'pack') return null;
  const d = data as PackNodeData;
  const meta = PACK_META[d.packKind];

  const entries = ORDER.map((k) => ({
    key: k,
    amount: d.stats[k] ?? 0,
    meta: RESOURCE_META[k],
  })).filter((e) => e.amount > 0);

  return (
    <div className="pack-node" title={meta.label} style={{ borderColor: meta.color }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
      <div className="pack-title" style={{ color: meta.color }}>
        {meta.label}
      </div>
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
    </div>
  );
}
