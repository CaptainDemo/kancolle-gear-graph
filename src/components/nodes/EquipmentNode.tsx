import { Handle, Position, type NodeProps } from '@xyflow/react';

import { EquipIcon } from '../EquipIcon';
import { RARITY_COLORS } from '../../lib/constants';
import { getEquipment } from '../../data/loader';
import type { EquipmentNodeData } from '../../data/graph';
import { useStore } from '../../store/useStore';

export function EquipmentNode({ id, data }: NodeProps) {
  const toggleNodeSide = useStore((s) => s.toggleNodeSide);

  if (data.kind !== 'equipment') return null;
  const d = data as EquipmentNodeData;
  const rarityColor = RARITY_COLORS[d.rarity] ?? '#94a3b8';
  const classes = ['equip-node'];
  if (d.isCenter) classes.push('center');
  if (d.expandedLeft || d.expandedRight) classes.push('expanded');

  const sc = d.selfConsume;
  const showImproveChip = sc && sc.improve > 0;

  const planCount = d.planCount ?? 1;
  const showPlanBadge = planCount > 1;

  // 进化自耗 chips：单方案/各方案相同 → 单 chip；不同 → 每方案一个 chip
  const evolveChips: Array<{ key: string; text: string; title: string }> = (() => {
    if (!sc || sc.evolve <= 0) return [];
    const byPlan = d.evolveSelfByPlan ?? [];
    if (byPlan.length === 0) {
      return [{ key: 'single', text: `進${sc.evolve}`, title: `进化消耗自身 ${sc.evolve} 份` }];
    }
    const allSame = byPlan.every((p) => p.count === byPlan[0].count);
    if (allSame) {
      return [
        {
          key: 'single',
          text: `進${sc.evolve}`,
          title: `进化消耗自身 ${sc.evolve} 份（各方案相同）`,
        },
      ];
    }
    return byPlan.map((p) => {
      const targetName = p.targetId
        ? getEquipment(p.targetId)?.name ?? `#${p.targetId}`
        : '无 upgrade';
      return {
        key: `p${p.planIndex}`,
        text: `進(P${p.planIndex + 1} ${p.count})`,
        title: `方案 ${p.planIndex + 1} → ${targetName}: ×${p.count}`,
      };
    });
  })();

  const showEvolveChips = evolveChips.length > 0;

  const leftCount = d.leftCount ?? 0;
  const rightCount = d.rightCount ?? 0;
  const showLeftBtn = leftCount > 0;
  const showRightBtn = rightCount > 0;

  const handleToggle = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    toggleNodeSide(id, side);
  };

  return (
    <div
      className={classes.join(' ')}
      style={{ borderColor: d.isCenter ? undefined : rarityColor }}
      title={`${d.label}（左 ${leftCount} 个邻居 / 右 ${rightCount} 个邻居）`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />

      {showLeftBtn && (
        <button
          className="expand-btn expand-left"
          onClick={(e) => handleToggle(e, 'left')}
          title={d.expandedLeft ? `收起左侧（${leftCount} 个）` : `展开左侧（${leftCount} 个邻居）`}
        >
          {d.expandedLeft ? '▾' : '▸'}
        </button>
      )}

      {d.iconTypeId != null && <EquipIcon iconTypeId={d.iconTypeId} size={24} />}
      <span className="name">{d.label}</span>
      {showPlanBadge && (
        <span
          className="plan-badge"
          title={`此装备有 ${planCount} 套改修方案（见右侧详情）`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            marginLeft: 4,
            fontSize: 10,
            fontWeight: 700,
            color: '#1a1a1a',
            background: '#ffd54f',
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          {planCount}
        </span>
      )}

      {showRightBtn && (
        <button
          className="expand-btn expand-right"
          onClick={(e) => handleToggle(e, 'right')}
          title={d.expandedRight ? `收起右侧（${rightCount} 个）` : `展开右侧（${rightCount} 个邻居）`}
        >
          {d.expandedRight ? '▾' : '▸'}
        </button>
      )}

      {(showImproveChip || showEvolveChips) && (
        <div className="self-consume-chips">
          {showImproveChip && (
            <span className="sc-chip improve" title={`改修消耗自身 ${sc!.improve} 份`}>
              改{sc!.improve}
            </span>
          )}
          {evolveChips.map((c) => (
            <span key={c.key} className="sc-chip evolve" title={c.title}>
              {c.text}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
    </div>
  );
}
