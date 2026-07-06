import {
  getEquipment,
  getEvolveConsumedByPlan,
  getEvolveSources,
  getEvolveTargets,
  getImproveConsumes,
  getImproveConsumedBy,
  getImproveResourcePack,
  getImprovementPlans,
  getQuest,
  getQuestsRequiringEquipment,
  getQuestsRewardingEquipment,
  getQuestsScrappingEquipment,
  getSelfConsume,
  getTypeName,
} from '../data/loader';
import type { ResourcePack } from '../types/improvement';
import { useStore } from '../store/useStore';
import { EquipIcon } from './EquipIcon';
import {
  MATERIAL_IDS,
  QUEST_CATEGORIES,
  RANGE_LABELS,
  RARITY_NAMES,
  STAT_LABELS,
} from '../lib/constants';
import type { EquipmentStats } from '../types/equipment';

const STAT_KEYS = Object.keys(STAT_LABELS) as (keyof EquipmentStats)[];

export function EquipmentDetail() {
  const selectedId = useStore((s) => s.selectedEquipId);
  const select = useStore((s) => s.selectEquipment);

  if (selectedId == null) {
    return <div className="empty-state">未选中装备</div>;
  }

  const eq = getEquipment(selectedId);
  if (!eq) {
    return <div className="empty-state">找不到装备 #{selectedId}</div>;
  }

  const plans = getImprovementPlans(selectedId);
  const multiPlan = plans.length > 1;
  // 进化来源/目标（多对一/一对多，跨方案合并）
  const evolveSources = getEvolveSources(selectedId);
  const evolveTargets = getEvolveTargets(selectedId);
  const rewardQuests = getQuestsRewardingEquipment(selectedId);
  const scrapQuests = getQuestsScrappingEquipment(selectedId);
  const requireQuests = getQuestsRequiringEquipment(selectedId);
  const selfConsume = getSelfConsume(selectedId);
  const hasSelfConsume = selfConsume.improve > 0 || selfConsume.evolve > 0;

  return (
    <div className="pane-body scrollbar detail-pane">
      <div className="detail-header">
        <EquipIcon iconTypeId={eq.iconTypeId} size={60} className="detail-icon" />
        <div className="detail-title">
          <div className="name">{eq.name}</div>
          <div className="meta">
            <span>#{eq.id}</span>
            <span>{getTypeName(eq.typeId)}</span>
            <span>{RARITY_NAMES[eq.rarity] ?? `★${eq.rarity}`}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>属性</h4>
        <div className="stat-grid">
          {STAT_KEYS.map((k) => {
            const v = eq.stats[k];
            return (
              <div key={k} className={`stat-row ${v === 0 ? 'zero' : 'nonzero'}`}>
                <span className="stat-label">{STAT_LABELS[k]}</span>
                <span className="stat-value">{v}</span>
              </div>
            );
          })}
          <div className={`stat-row ${eq.range === 0 ? 'zero' : 'nonzero'}`}>
            <span className="stat-label">射程</span>
            <span className="stat-value">{RANGE_LABELS[eq.range] ?? eq.range}</span>
          </div>
          {eq.distance != null && (
            <div className="stat-row nonzero">
              <span className="stat-label">航程</span>
              <span className="stat-value">{eq.distance}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h4>拆解（退役返还）</h4>
        <div className="stat-grid">
          <StatRow label={MATERIAL_IDS.fuel} value={eq.broken[0]} />
          <StatRow label={MATERIAL_IDS.ammo} value={eq.broken[1]} />
          <StatRow label={MATERIAL_IDS.steel} value={eq.broken[2]} />
          <StatRow label={MATERIAL_IDS.bauxite} value={eq.broken[3]} />
        </div>
      </div>

      <div className="detail-section">
        <h4>改修/进化关系</h4>
        <div className="relationship-list">
          {evolveSources.length === 0 &&
            evolveTargets.length === 0 &&
            getImproveConsumes(selectedId).length === 0 &&
            plans.every((p) => p.evolveConsumes.length === 0) &&
            getImproveConsumedBy(selectedId).length === 0 &&
            getEvolveConsumedByPlan(selectedId).length === 0 &&
            rewardQuests.length === 0 &&
            scrapQuests.length === 0 &&
            requireQuests.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>无关系数据</div>
            )}

          {evolveSources.length > 0 && (
            <RelationGroup label="进化来源（→ 此装备）">
              {evolveSources.map(({ planIndex, sourceId }, i) => (
                <RelationItem
                  key={`es-${sourceId}-${i}`}
                  id={sourceId}
                  onClick={select}
                  note={
                    getImprovementPlans(sourceId).length > 1 ? `方案 ${planIndex + 1}` : undefined
                  }
                />
              ))}
            </RelationGroup>
          )}
          {evolveTargets.length > 0 && (
            <RelationGroup label="进化目标（此装备 →）">
              {evolveTargets.map(({ planIndex, targetId }, i) => (
                <RelationItem
                  key={`et-${targetId}-${i}`}
                  id={targetId}
                  onClick={select}
                  note={multiPlan ? `方案 ${planIndex + 1}` : undefined}
                />
              ))}
            </RelationGroup>
          )}

          {(() => {
            const rels = getImproveConsumes(selectedId);
            if (rels.length === 0) return null;
            return (
              <RelationGroup label="改修耗材（此装备消耗 · 各方案相同）">
                {rels.map((rel) => (
                  <RelationItem
                    key={`ic-${rel.consumerId}`}
                    id={rel.consumerId}
                    onClick={select}
                    suffix={`×${rel.totalCount}`}
                  />
                ))}
              </RelationGroup>
            );
          })()}

          {plans
            .filter((plan) => plan.evolveConsumes.length > 0)
            .map((plan) => (
              <RelationGroup
                key={`ec-plan-${plan.planIndex}`}
                label={`进化耗材（此装备消耗）${
                  multiPlan ? `·方案 ${plan.planIndex + 1}` : ''
                }`}
              >
                {plan.evolveConsumes.map((rel) => (
                  <RelationItem
                    key={`ec-${plan.planIndex}-${rel.consumerId}`}
                    id={rel.consumerId}
                    onClick={select}
                    suffix={`×${rel.count}`}
                  />
                ))}
              </RelationGroup>
            ))}

          {(() => {
            const rels = getImproveConsumedBy(selectedId);
            if (rels.length === 0) return null;
            return (
              <RelationGroup label="改修耗材被消耗于">
                {rels.map((rel) => (
                  <RelationItem
                    key={`icb-${rel.consumerId}`}
                    id={rel.consumerId}
                    onClick={select}
                    suffix={`×${rel.totalCount}`}
                  />
                ))}
              </RelationGroup>
            );
          })()}
          {(() => {
            const rels = getEvolveConsumedByPlan(selectedId);
            if (rels.length === 0) return null;
            return (
              <RelationGroup label="进化耗材被消耗于">
                {rels.map((rel, i) => (
                  <RelationItem
                    key={`ecb-${rel.consumerId}-${rel.planIndex}-${i}`}
                    id={rel.consumerId}
                    onClick={select}
                    suffix={`×${rel.count}`}
                    note={
                      getImprovementPlans(rel.consumerId).length > 1
                        ? `方案 ${rel.planIndex + 1}`
                        : undefined
                    }
                  />
                ))}
              </RelationGroup>
            );
          })()}
          {rewardQuests.length > 0 && (
            <RelationGroup label="相关任务（奖励此装备）">
              {rewardQuests.map((qid) => (
                <QuestItem key={`rq-${qid}`} qid={qid} />
              ))}
            </RelationGroup>
          )}
          {scrapQuests.length > 0 && (
            <RelationGroup label="相关任务（废弃此装备）">
              {scrapQuests.map((r) => (
                <QuestItem key={`sq-${r.questId}`} qid={r.questId} suffix={`×${r.amount}`} />
              ))}
            </RelationGroup>
          )}
          {requireQuests.length > 0 && (
            <RelationGroup label="相关任务（需要此装备）">
              {requireQuests.map((r) => (
                <QuestItem
                  key={`req-${r.questId}`}
                  qid={r.questId}
                  suffix={r.amount > 1 ? `×${r.amount}` : undefined}
                />
              ))}
            </RelationGroup>
          )}
        </div>
      </div>

      {(() => {
        const improvePack = getImproveResourcePack(selectedId);
        if (!improvePack) return null;
        // 各方案改修消耗相同；rangeLabel 取决于是否有 upgrade（即 plan 0 是否有 upgrade target）
        const plan0 = plans[0];
        const hasUpgrade = !!plan0?.upgradeTargetId;
        const rangeLabel = hasUpgrade ? '0→9★' : '0→★max';
        return (
          <div className="detail-section">
            <h4>
              改修素材包（{rangeLabel}，各方案相同）
            </h4>
            <PackStats pack={improvePack} />
          </div>
        );
      })()}

      {plans
        .filter((plan) => plan.evolvePack !== null)
        .map((plan) => {
          const planNote = multiPlan ? ` 方案 ${plan.planIndex + 1}/${plans.length}` : '';
          const upgradeSuffix = plan.upgradeTargetId
            ? ` → ${getEquipment(plan.upgradeTargetId)?.name ?? `#${plan.upgradeTargetId}`}`
            : '';
          return (
            <div className="detail-section" key={`plan-evolve-${plan.planIndex}`}>
              <h4>
                进化素材包{planNote}
                <span style={{ color: 'var(--text-dim)', fontWeight: 'normal' }}>
                  {upgradeSuffix ? ` (stage 2)${upgradeSuffix}` : ' (stage 2)'}
                </span>
              </h4>
              {plan.evolvePack && <PackStats pack={plan.evolvePack} />}
            </div>
          );
        })}

      {hasSelfConsume && (
        <div className="detail-section">
          <h4>自耗（改修/进化时消耗自身）</h4>
          <div className="stat-grid">
            {selfConsume.improve > 0 && (
              <StatRow label="改修 0→9★" value={selfConsume.improve} />
            )}
          </div>
          {(() => {
            // 按 plan 列出进化自耗明细（不同方案 stage 2 自耗可能不同）
            const evolveSelfPlans = plans.filter((p) => p.selfConsume.evolve > 0);
            if (evolveSelfPlans.length === 0) return null;
            const allSame = evolveSelfPlans.every(
              (p) => p.selfConsume.evolve === evolveSelfPlans[0].selfConsume.evolve,
            );
            if (allSame && !multiPlan) {
              return (
                <div className="stat-grid" style={{ marginTop: 4 }}>
                  <StatRow label="进化" value={evolveSelfPlans[0].selfConsume.evolve} />
                </div>
              );
            }
            return (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  进化自耗（按方案）
                </div>
                {evolveSelfPlans.map((p) => {
                  const target = p.upgradeTargetId
                    ? getEquipment(p.upgradeTargetId)?.name ?? `#${p.upgradeTargetId}`
                    : '无 upgrade';
                  return (
                    <div
                      key={`sc-evo-${p.planIndex}`}
                      className="relationship-item"
                      style={{ fontSize: 11 }}
                    >
                      <span>
                        {multiPlan ? `方案 ${p.planIndex + 1} → ` : ''}
                        {target}
                      </span>{' '}
                      <span style={{ color: 'var(--text-dim)' }}>×{p.selfConsume.evolve}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <div className="detail-section">
        <h4>外部链接</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a
            href={`https://wiki.biligame.com/kancolle/No.${eq.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Bwiki No.{eq.id}
          </a>
          <a
            href={`https://en.kancollewiki.net/Equipment#${eq.id}`}
            target="_blank"
            rel="noreferrer"
          >
            EN Wiki
          </a>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className={`stat-row ${value === 0 ? 'zero' : 'nonzero'}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function PackStats({ pack }: { pack: ResourcePack }) {
  return (
    <div className="stat-grid">
      <StatRow label={MATERIAL_IDS.fuel} value={pack.fuel} />
      <StatRow label={MATERIAL_IDS.ammo} value={pack.ammo} />
      <StatRow label={MATERIAL_IDS.steel} value={pack.steel} />
      <StatRow label={MATERIAL_IDS.bauxite} value={pack.bauxite} />
      <StatRow label={MATERIAL_IDS.screw} value={pack.screw} />
      <StatRow label={MATERIAL_IDS.devmat} value={pack.devmat} />
    </div>
  );
}

function RelationGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function RelationItem({
  id,
  onClick,
  suffix,
  note,
}: {
  id: number;
  onClick: (id: number) => void;
  suffix?: string;
  note?: string;
}) {
  const eq = getEquipment(id);
  if (!eq) return null;
  return (
    <div className="relationship-item" onClick={() => onClick(id)}>
      <span>{eq.name}</span>{' '}
      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
        #{eq.id}
        {suffix && ` · ${suffix}`}
        {note && ` · ${note}`}
      </span>
    </div>
  );
}

function QuestItem({ qid, suffix }: { qid: number; suffix?: string }) {
  const q = getQuest(qid);
  if (!q) return null;
  return (
    <div className="relationship-item" style={{ borderColor: '#42a5f5' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
        {q.wikiId}
      </span>{' '}
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        [{QUEST_CATEGORIES[q.category] ?? q.category}]
      </span>{' '}
      <span>{q.name}</span>
      {suffix && (
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}> · {suffix}</span>
      )}
    </div>
  );
}
