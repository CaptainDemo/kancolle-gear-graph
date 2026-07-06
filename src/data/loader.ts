import apiStart2 from '../../data/api_start2.json';
import improveData from '../../data/improve_data.json';
import questsBundle from '../../data/quests.bundle.json';

import type { Equipment, EquipmentStats, RawSlotItem, RawEquipType } from '../types/equipment';
import type { Quest, RawQuest } from '../types/quest';
import type {
  EvolveConsumeRelation,
  ImprovementData,
  ImprovementEntry,
  ImprovementPlan,
  ImproveConsumeRelation,
  EvolveConsumePlanRelation,
  EvolveRelation,
  EvolveSourceRelation,
  RawImprovementItem,
  ResourcePack,
  ResourcePackWithEquipment,
} from '../types/improvement';

interface ApiStart2 {
  api_data?: {
    api_mst_slotitem: RawSlotItem[];
    api_mst_slotitem_equiptype: RawEquipType[];
  };
  api_mst_slotitem?: RawSlotItem[];
  api_mst_slotitem_equiptype?: RawEquipType[];
}

const api = apiStart2 as unknown as ApiStart2;
const slotItems: RawSlotItem[] = api.api_data?.api_mst_slotitem ?? api.api_mst_slotitem ?? [];
const equipTypes: RawEquipType[] =
  api.api_data?.api_mst_slotitem_equiptype ?? api.api_mst_slotitem_equiptype ?? [];

const typeNameMap = new Map<number, string>();
for (const t of equipTypes) typeNameMap.set(t.api_id, t.api_name);

const equipmentMap = new Map<number, Equipment>();
const equipmentNameToId = new Map<string, number>();

const mapStats = (s: RawSlotItem): EquipmentStats => ({
  houg: s.api_houg,
  raig: s.api_raig,
  tyku: s.api_tyku,
  souk: s.api_souk,
  tais: s.api_tais,
  houm: s.api_houm,
  houk: s.api_houk,
  saku: s.api_saku,
  luck: s.api_luck,
  baku: s.api_baku,
});

for (const s of slotItems) {
  if (s.api_id < 1) continue;
  const eq: Equipment = {
    id: s.api_id,
    name: s.api_name,
    sortno: s.api_sortno,
    typeId: s.api_type[2],
    iconTypeId: s.api_type[3],
    rarity: s.api_rare,
    stats: mapStats(s),
    broken: s.api_broken,
    cost: s.api_cost,
    distance: s.api_distance,
    range: s.api_leng,
  };
  equipmentMap.set(eq.id, eq);
  equipmentNameToId.set(eq.name, eq.id);
}

const improvementMap = new Map<number, RawImprovementItem>();
const improvementByKey = improveData as unknown as ImprovementData;
for (const key of Object.keys(improvementByKey)) {
  const item = improvementByKey[key];
  if (item && item.id) improvementMap.set(item.id, item);
}

const questMap = new Map<number, Quest>();
const questsRaw = questsBundle as unknown as Record<string, RawQuest>;
for (const key of Object.keys(questsRaw)) {
  const q = questsRaw[key];
  if (!q || !q.game_id) continue;
  questMap.set(q.game_id, {
    id: q.game_id,
    wikiId: q.wiki_id,
    category: q.category,
    name: q.name,
    detail: q.detail,
    rewards: {
      fuel: q.reward_fuel,
      ammo: q.reward_ammo,
      steel: q.reward_steel,
      bauxite: q.reward_bauxite,
      other: q.reward_other ?? [],
    },
    prerequisite: q.prerequisite ?? [],
    requirements: q.requirements ?? {},
  });
}

// ============================================================================
// 改修/进化预计算
// ============================================================================

// 阶段对应的尝试次数（poi 数据 3 阶段：0-5★/6-9★/★max）
// 0-5★ = 5 次改修（0→1, 1→2, ..., 4→5）
// 6-9★ = 4 次改修（5→6, 6→7, 7→8, 8→9）
// ★max = 1 次改修（9→10，通常同时触发进化）
const STAGE_ATTEMPTS_PARTIAL: number[] = [5, 4]; // 0→9★ 累计（仅 stages 0+1）
const STAGE_ATTEMPTS_FULL: number[] = [5, 4, 1]; // 0→★max 累计（仅无 upgrade 装备使用）

function computeImprovePack(
  entry: ImprovementEntry,
  stages: number[],
): ResourcePackWithEquipment {
  const result: ResourcePackWithEquipment = {
    fuel: 0,
    ammo: 0,
    steel: 0,
    bauxite: 0,
    screw: 0,
    devmat: 0,
    equipment: new Map<number, number>(),
  };

  const totalAttempts = stages.reduce((a, b) => a + b, 0);
  result.fuel = entry.consume.fuel * totalAttempts;
  result.ammo = entry.consume.ammo * totalAttempts;
  result.steel = entry.consume.steel * totalAttempts;
  result.bauxite = entry.consume.bauxite * totalAttempts;

  entry.consume.material.forEach((mat, i) => {
    if (i >= stages.length) return; // 仅遍历前 stages.length 个 stage
    const attempts = stages[i];
    // 取 [0] = 通常消耗（不是"确保"消耗）
    result.screw += mat.improvement[0] * attempts;
    result.devmat += mat.development[0] * attempts;
    if (mat.item.id) {
      result.equipment.set(
        mat.item.id,
        (result.equipment.get(mat.item.id) ?? 0) + mat.item.count * attempts,
      );
    }
  });

  return result;
}

function computeEvolvePack(entry: ImprovementEntry): ResourcePackWithEquipment | null {
  if (!entry.upgrade?.id) return null;
  const stage = entry.consume.material[2];
  if (!stage) return null;

  return {
    fuel: entry.consume.fuel,
    ammo: entry.consume.ammo,
    steel: entry.consume.steel,
    bauxite: entry.consume.bauxite,
    screw: stage.improvement[0],
    devmat: stage.development[0],
    equipment: new Map([[stage.item.id, stage.item.count]]),
  };
}

// 每装备的多方案衍生数据
const improvementPlansMap = new Map<number, ImprovementPlan[]>();

// 改修素材包（取 plan 0：数据上各方案改修消耗完全相同，已验证）
const improveResourcePackMap = new Map<number, ResourcePack>();

// 进化素材包：外层 key = equipId，内层 key = planIndex
const evolveResourcePackMap = new Map<number, Map<number, ResourcePack>>();

// 改修耗材关系（聚合：dedup by consumerId，因各方案改修消耗相同）
// forward：A 自己改修时消耗哪些装备
const improveConsumesMap = new Map<number, ImproveConsumeRelation[]>();
// reverse：谁改修时消耗 A
const improveConsumeByMap = new Map<number, ImproveConsumeRelation[]>();

// 进化耗材关系（按方案，因 stage 2 各方案不同）
const evolveConsumesMap = new Map<number, EvolveConsumePlanRelation[]>();
const evolveConsumeByMap = new Map<number, EvolveConsumePlanRelation[]>();

// 进化升级关系（一对多：一个装备在不同方案下可进化为不同目标）
const evolveFromToMap = new Map<number, EvolveRelation[]>();
const evolveToFromMap = new Map<number, EvolveSourceRelation[]>();

// 自耗：improve 取 plan 0（各方案相同），evolve 取跨方案 max（不同方案 stage 2 可能不同）
const selfConsumeMap = new Map<number, { improve: number; evolve: number }>();

for (const [consumerId, imp] of improvementMap) {
  const plans: ImprovementPlan[] = [];
  let plan0ImprovePack: ResourcePack | null = null;
  let aggregatedSelfImprove = 0;
  let aggregatedSelfEvolve = 0;
  const evolvePacksByPlan = new Map<number, ResourcePack>();

  imp.improvement.forEach((entry, planIndex) => {
    const hasUpgrade = !!entry.upgrade?.id;
    // 改修包：有 upgrade 时仅 stages 0+1（0→9★）；无 upgrade 时 stages 0+1+2（0→★max）
    const improvePackStages = hasUpgrade ? STAGE_ATTEMPTS_PARTIAL : STAGE_ATTEMPTS_FULL;
    const improvePackWithEquip = computeImprovePack(entry, improvePackStages);
    const evolvePackWithEquip = computeEvolvePack(entry);

    // 改修素材包：仅取 plan 0 的数据（验证表明各方案改修消耗完全相同）
    if (planIndex === 0) {
      plan0ImprovePack = {
        fuel: improvePackWithEquip.fuel,
        ammo: improvePackWithEquip.ammo,
        steel: improvePackWithEquip.steel,
        bauxite: improvePackWithEquip.bauxite,
        screw: improvePackWithEquip.screw,
        devmat: improvePackWithEquip.devmat,
      };
    }

    // 此方案的 selfConsume
    const planSelfConsume = { improve: 0, evolve: 0 };
    improvePackWithEquip.equipment.forEach((count, consumedId) => {
      if (consumedId === consumerId) planSelfConsume.improve += count;
    });
    if (evolvePackWithEquip) {
      evolvePackWithEquip.equipment.forEach((count, consumedId) => {
        if (consumedId === consumerId) planSelfConsume.evolve += count;
      });
    }
    // 改修 selfConsume：取 plan 0（不变量）；进化 selfConsume：跨方案 max
    if (planIndex === 0) aggregatedSelfImprove = planSelfConsume.improve;
    aggregatedSelfEvolve = Math.max(aggregatedSelfEvolve, planSelfConsume.evolve);

    // 改修耗材（聚合；自耗已单独记录；多方案产生相同数据，dedup by consumerId）
    const planImproveConsumes: ImproveConsumeRelation[] = [];
    improvePackWithEquip.equipment.forEach((count, consumedId) => {
      if (consumedId === consumerId) return;
      planImproveConsumes.push({ consumerId: consumedId, totalCount: count });

      const fwd = improveConsumesMap.get(consumerId) ?? [];
      if (!fwd.find((r) => r.consumerId === consumedId && r.totalCount === count)) {
        fwd.push({ consumerId: consumedId, totalCount: count });
        improveConsumesMap.set(consumerId, fwd);
      }

      const rev = improveConsumeByMap.get(consumedId) ?? [];
      if (!rev.find((r) => r.consumerId === consumerId && r.totalCount === count)) {
        rev.push({ consumerId, totalCount: count });
        improveConsumeByMap.set(consumedId, rev);
      }
    });

    // 进化耗材（按方案；自耗单独记录）
    const planEvolveConsumes: EvolveConsumeRelation[] = [];
    if (evolvePackWithEquip) {
      evolvePackWithEquip.equipment.forEach((count, consumedId) => {
        if (consumedId === consumerId) return;
        planEvolveConsumes.push({ consumerId: consumedId, count });

        const fwd = evolveConsumesMap.get(consumerId) ?? [];
        fwd.push({ planIndex, consumerId: consumedId, count });
        evolveConsumesMap.set(consumerId, fwd);

        const rev = evolveConsumeByMap.get(consumedId) ?? [];
        rev.push({ planIndex, consumerId, count });
        evolveConsumeByMap.set(consumedId, rev);
      });

      const evolveResourcePack: ResourcePack = {
        fuel: evolvePackWithEquip.fuel,
        ammo: evolvePackWithEquip.ammo,
        steel: evolvePackWithEquip.steel,
        bauxite: evolvePackWithEquip.bauxite,
        screw: evolvePackWithEquip.screw,
        devmat: evolvePackWithEquip.devmat,
      };
      evolvePacksByPlan.set(planIndex, evolveResourcePack);
    }

    // 进化升级关系（一对多）
    if (entry.upgrade?.id) {
      const fwd = evolveFromToMap.get(consumerId) ?? [];
      fwd.push({ planIndex, targetId: entry.upgrade.id });
      evolveFromToMap.set(consumerId, fwd);

      const rev = evolveToFromMap.get(entry.upgrade.id) ?? [];
      rev.push({ planIndex, sourceId: consumerId });
      evolveToFromMap.set(entry.upgrade.id, rev);
    }

    plans.push({
      planIndex,
      upgradeTargetId: entry.upgrade?.id,
      improvePack: {
        fuel: improvePackWithEquip.fuel,
        ammo: improvePackWithEquip.ammo,
        steel: improvePackWithEquip.steel,
        bauxite: improvePackWithEquip.bauxite,
        screw: improvePackWithEquip.screw,
        devmat: improvePackWithEquip.devmat,
      },
      evolvePack: evolvePackWithEquip
        ? {
            fuel: evolvePackWithEquip.fuel,
            ammo: evolvePackWithEquip.ammo,
            steel: evolvePackWithEquip.steel,
            bauxite: evolvePackWithEquip.bauxite,
            screw: evolvePackWithEquip.screw,
            devmat: evolvePackWithEquip.devmat,
          }
        : null,
      improveConsumes: planImproveConsumes,
      evolveConsumes: planEvolveConsumes,
      selfConsume: planSelfConsume,
    });
  });

  improvementPlansMap.set(consumerId, plans);
  if (plan0ImprovePack) {
    improveResourcePackMap.set(consumerId, plan0ImprovePack);
  }
  if (evolvePacksByPlan.size > 0) {
    evolveResourcePackMap.set(consumerId, evolvePacksByPlan);
  }
  selfConsumeMap.set(consumerId, {
    improve: aggregatedSelfImprove,
    evolve: aggregatedSelfEvolve,
  });
}

// ============================================================================
// 任务关系
// ============================================================================

const rewardEquipToQuestsMap = new Map<number, number[]>();
const scrapEquipToQuestsMap = new Map<number, { questId: number; amount: number }[]>();
const requireEquipToQuestsMap = new Map<number, { questId: number; amount: number }[]>();

for (const [qid, q] of questMap) {
  for (const r of q.rewards.other) {
    if (r.category === '装備' || r.category === '装备') {
      const eid = equipmentNameToId.get(r.name);
      if (eid !== undefined) {
        const list = rewardEquipToQuestsMap.get(eid) ?? [];
        if (!list.includes(qid)) list.push(qid);
        rewardEquipToQuestsMap.set(eid, list);
      }
    }
  }

  for (const it of q.requirements.scraps ?? []) {
    const eid = equipmentNameToId.get(it.name);
    if (eid === undefined) continue;
    const list = scrapEquipToQuestsMap.get(eid) ?? [];
    list.push({ questId: qid, amount: it.amount ?? 1 });
    scrapEquipToQuestsMap.set(eid, list);
  }

  for (const it of q.requirements.equipments ?? []) {
    const eid = equipmentNameToId.get(it.name);
    if (eid === undefined) continue;
    const list = requireEquipToQuestsMap.get(eid) ?? [];
    list.push({ questId: qid, amount: it.amount ?? 1 });
    requireEquipToQuestsMap.set(eid, list);
  }

  if (q.requirements.equipment) {
    const eid = equipmentNameToId.get(q.requirements.equipment);
    if (eid !== undefined) {
      const list = requireEquipToQuestsMap.get(eid) ?? [];
      list.push({ questId: qid, amount: 1 });
      requireEquipToQuestsMap.set(eid, list);
    }
  }
}

// ============================================================================
// 查询接口
// ============================================================================

export const getEquipment = (id: number): Equipment | undefined => equipmentMap.get(id);
export const getAllEquipments = (): Equipment[] => Array.from(equipmentMap.values());
export const getEquipmentCount = (): number => equipmentMap.size;
export const getTypeName = (id: number): string => typeNameMap.get(id) ?? '?';
export const getAllTypeIds = (): number[] => Array.from(typeNameMap.keys()).sort((a, b) => a - b);

export const getImprovement = (id: number): RawImprovementItem | undefined =>
  improvementMap.get(id);
export const isImprovable = (id: number): boolean => improvementMap.has(id);

export const getQuest = (id: number): Quest | undefined => questMap.get(id);
export const getAllQuests = (): Quest[] => Array.from(questMap.values());

// 多方案衍生数据（详情面板用）
export const getImprovementPlans = (equipId: number): ImprovementPlan[] =>
  improvementPlansMap.get(equipId) ?? [];

// 改修耗材（聚合：各方案改修消耗相同，去重后单条）
// forward：X 自己改修消耗哪些装备（X 的 LEFT）
export const getImproveConsumes = (equipId: number): ImproveConsumeRelation[] =>
  improveConsumesMap.get(equipId) ?? [];
// reverse：哪些装备的改修消耗 X（X 的 RIGHT）
export const getImproveConsumedBy = (equipId: number): ImproveConsumeRelation[] =>
  improveConsumeByMap.get(equipId) ?? [];

// 进化耗材（按方案）
export const getEvolveConsumesByPlan = (equipId: number): EvolveConsumePlanRelation[] =>
  evolveConsumesMap.get(equipId) ?? [];
export const getEvolveConsumedByPlan = (equipId: number): EvolveConsumePlanRelation[] =>
  evolveConsumeByMap.get(equipId) ?? [];

// 进化关系（一对多）：X 进化为谁（RIGHT），每方案一个目标
export const getEvolveTargets = (equipId: number): EvolveRelation[] =>
  evolveFromToMap.get(equipId) ?? [];
// 进化关系（多对一）：谁进化为 X（LEFT）
export const getEvolveSources = (equipId: number): EvolveSourceRelation[] =>
  evolveToFromMap.get(equipId) ?? [];

// 改修素材包（取 plan 0：各方案改修消耗相同）
export const getImproveResourcePack = (equipId: number): ResourcePack | undefined =>
  improveResourcePackMap.get(equipId);
// 进化素材包（按方案）：返回 planIndex → ResourcePack 映射
export const getEvolveResourcePacksByPlan = (
  equipId: number,
): Map<number, ResourcePack> => evolveResourcePackMap.get(equipId) ?? new Map();

// 任务奖励装备
export const getQuestsRewardingEquipment = (equipId: number): number[] =>
  rewardEquipToQuestsMap.get(equipId) ?? [];

// 任务废弃装备（任务消耗某装备）
export const getQuestsScrappingEquipment = (
  equipId: number,
): { questId: number; amount: number }[] => scrapEquipToQuestsMap.get(equipId) ?? [];

// 任务要求装备（持有/装备，不一定消耗）
export const getQuestsRequiringEquipment = (
  equipId: number,
): { questId: number; amount: number }[] => requireEquipToQuestsMap.get(equipId) ?? [];

// 自耗（聚合所有方案的改修/进化消耗自身总数）
export const getSelfConsume = (equipId: number): { improve: number; evolve: number } =>
  selfConsumeMap.get(equipId) ?? { improve: 0, evolve: 0 };

export const getEquipmentIdByName = (name: string): number | undefined =>
  equipmentNameToId.get(name);
