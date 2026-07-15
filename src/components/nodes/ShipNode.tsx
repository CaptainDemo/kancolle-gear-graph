import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { ShipNodeData } from '../../data/graph';

const STYPE_LABEL: Record<number, string> = {
  1: 'DE', // 海防
  2: 'DD', // 驱逐
  3: 'CL', // 轻巡
  4: 'CLT', // 重雷装
  5: 'AV', // 水机
  6: 'CA', // 重巡
  7: 'CAV', // 航巡
  8: 'FBB', // 高速战舰
  9: 'BB', // 低速战舰
  10: 'BBV', // 航战
  11: 'CV', // 正规空母
  12: 'BB', // 超弩级（大和型）
  13: 'CVL', // 轻空母
  14: 'SS', // 潜水
  15: 'SSV', // 潜水空母
  16: 'AP', // 补给
  17: 'AS', // 潜水母舰
  18: 'LHA', // 扬陆
  19: 'CVB', // 装甲空母
  20: 'AR', // 工作
  21: 'SS', // 敷岛型潜水
  22: 'AO', // 给油
};

export function ShipNode({ data }: NodeProps) {
  if (data.kind !== 'ship') return null;
  const d = data as ShipNodeData;
  const stypeLabel = STYPE_LABEL[d.stype] ?? `T${d.stype}`;

  return (
    <div className="ship-node" title="舰船 · 初始装备来源">
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />
      <div className="sid">
        #{d.shipId} <span style={{ color: 'var(--text-dim)' }}>[{stypeLabel}]</span>
      </div>
      <div className="sname">{d.label}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
    </div>
  );
}
