import type { Edge, Node } from '@xyflow/react';

import {
  getEquipment,
  getEvolveConsumedByPlan,
  getEvolveConsumesByPlan,
  getEvolveResourcePacksByPlan,
  getEvolveSources,
  getEvolveTargets,
  getImproveConsumedBy,
  getImproveConsumes,
  getImproveResourcePack,
  getImprovementPlans,
  getQuest,
  getQuestsRequiringEquipment,
  getQuestsRewardingEquipment,
  getQuestsScrappingEquipment,
  getSelfConsume,
  getShip,
  getShipsEquippingEquipment,
  getDevelopResourcePack,
} from './loader';
import type { ResourcePack } from '../types/improvement';
import type { EdgeKind } from '../lib/constants';

// ============================================================================
// 节点数据类型
// ============================================================================

interface BaseNodeData {
  isCenter?: boolean;
  parentInstanceId?: string;
  parentSide?: 'left' | 'right';
  level: number; // 距中心层数（center=0）
  expandedLeft?: boolean;
  expandedRight?: boolean;
  [key: string]: unknown;
}

export interface EquipmentNodeData extends BaseNodeData {
  kind: 'equipment';
  label: string;
  equipmentId: number;
  rarity: number;
  iconTypeId: number;
  selfConsume: { improve: number; evolve: number };
  // 进化自耗 per-plan 明细（不同方案 stage 2 自耗可能不同；图上 chip 只显示 max）
  evolveSelfByPlan?: Array<{ planIndex: number; targetId?: number; count: number }>;
  planCount?: number; // 改修方案数（>1 表示多方案装备）
  // 该节点在当前展开状态下，左/右方向有多少个未展开邻居（用于按钮提示）
  leftCount?: number;
  rightCount?: number;
}

export interface QuestNodeData extends BaseNodeData {
  kind: 'quest';
  label: string;
  questId: number;
  category: number;
}

export interface ShipNodeData extends BaseNodeData {
  kind: 'ship';
  label: string;
  shipId: number;
  stype: number;
}

export interface PackNodeData extends BaseNodeData {
  kind: 'pack';
  packKind: 'improve' | 'evolve' | 'develop';
  ownerId: number;
  stats: ResourcePack;
}

export interface AggregateNodeData extends BaseNodeData {
  kind: 'aggregate';
  side: 'left' | 'right';
  count: number;
  expanded: boolean;
}

export type GraphNodeData =
  | EquipmentNodeData
  | QuestNodeData
  | ShipNodeData
  | PackNodeData
  | AggregateNodeData;

export type GraphNode = Node<GraphNodeData>;

// ============================================================================
// 边数据类型
// ============================================================================

export interface GraphEdgeData {
  kind: EdgeKind;
  label?: string;
  amount?: number;
  side?: 'left' | 'right';
  [key: string]: unknown;
}

export type GraphEdge = Edge<GraphEdgeData>;

// ============================================================================
// 实例 ID 编码（路径编码，支持任意深度）
// ============================================================================

const centerInstanceId = (id: number) => `eq-${id}-c`;
const childInstanceId = (equipId: number, side: 'left' | 'right', parentInstance: string) =>
  `eq-${equipId}-${side[0]}-${parentInstance}`;
const questInstanceId = (qid: number, side: 'left' | 'right', parentInstance: string) =>
  `q-${qid}-${side[0]}-${parentInstance}`;
const shipInstanceId = (shipId: number, side: 'left' | 'right', parentInstance: string) =>
  `s-${shipId}-${side[0]}-${parentInstance}`;
const packInstanceId = (
  parentInstance: string,
  packKind: 'improve' | 'evolve' | 'develop',
  planIndex?: number,
) =>
  planIndex != null
    ? `pack-${packKind}-p${planIndex}-${parentInstance}`
    : `pack-${packKind}-${parentInstance}`;

// ============================================================================
// 构建函数：递归展开
// ============================================================================

interface ExpandedState {
  left: boolean;
  right: boolean;
}

const FOLD_THRESHOLD = 5;

interface NeighborEntry {
  equipId?: number;
  questId?: number;
  shipId?: number;
  kind: EdgeKind;
  label: string;
  amount?: number;
  planIndex?: number;
}

export function buildEquipmentTree(
  centerId: number,
  expandedNodes: Map<string, ExpandedState>,
  expandedAggregates: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const pathSet = new Set<string>(); // 防 cycle：记录路径上的 instanceId

  const getExpanded = (instanceId: string, isCenter: boolean): ExpandedState => {
    const s = expandedNodes.get(instanceId);
    if (s) return s;
    return isCenter ? { left: true, right: true } : { left: false, right: false };
  };

  const addEdge = (
    source: string,
    target: string,
    kind: EdgeKind,
    meta: { label?: string; amount?: number; side?: 'left' | 'right'; planIndex?: number } = {},
  ): void => {
    if (source === target) return;
    const id =
      meta.planIndex != null
        ? `e-${source}-${target}-${kind}-p${meta.planIndex}`
        : `e-${source}-${target}-${kind}`;
    if (edges.has(id)) return;
    edges.set(id, {
      id,
      source,
      target,
      type: 'labeled',
      label: meta.label,
      data: { kind, side: meta.side, ...meta },
    });
  };

  const addEquipment = (
    equipId: number,
    instanceId: string,
    parentInstance: string | null,
    side: 'left' | 'right' | 'center',
    level: number,
  ): void => {
    const eq = getEquipment(equipId);
    if (!eq) return;
    const isCenter = side === 'center';
    const expanded = getExpanded(instanceId, isCenter);

    // 计算未展开状态下该方向有多少邻居（用于按钮提示）
    const leftCount = countLeftNeighbors(equipId);
    const rightCount = countRightNeighbors(equipId);
    const plans = getImprovementPlans(equipId);
    const planCount = plans.length;
    // 收集进化自耗 per-plan（仅含有自耗的方案）
    const evolveSelfByPlan = plans
      .filter((p) => p.selfConsume.evolve > 0)
      .map((p) => ({
        planIndex: p.planIndex,
        targetId: p.upgradeTargetId,
        count: p.selfConsume.evolve,
      }));

    nodes.set(instanceId, {
      id: instanceId,
      type: 'equipment',
      position: { x: 0, y: 0 },
      data: {
        kind: 'equipment',
        label: eq.name,
        equipmentId: equipId,
        rarity: eq.rarity,
        iconTypeId: eq.iconTypeId,
        isCenter,
        parentSide: isCenter ? undefined : (side as 'left' | 'right'),
        parentInstanceId: parentInstance ?? undefined,
        level,
        expandedLeft: expanded.left,
        expandedRight: expanded.right,
        selfConsume: getSelfConsume(equipId),
        evolveSelfByPlan,
        planCount,
        leftCount,
        rightCount,
      },
    });
  };

  const addQuest = (
    qid: number,
    parentInstance: string,
    side: 'left' | 'right',
    level: number,
  ): string | null => {
    const instanceId = questInstanceId(qid, side, parentInstance);
    if (nodes.has(instanceId)) return instanceId;
    const q = getQuest(qid);
    if (!q) return null;
    nodes.set(instanceId, {
      id: instanceId,
      type: 'quest',
      position: { x: 0, y: 0 },
      data: {
        kind: 'quest',
        label: q.name,
        questId: qid,
        category: q.category,
        parentInstanceId: parentInstance,
        parentSide: side,
        level,
      },
    });
    return instanceId;
  };

  const addShip = (
    shipId: number,
    parentInstance: string,
    side: 'left' | 'right',
    level: number,
  ): string | null => {
    const instanceId = shipInstanceId(shipId, side, parentInstance);
    if (nodes.has(instanceId)) return instanceId;
    const s = getShip(shipId);
    if (!s) return null;
    nodes.set(instanceId, {
      id: instanceId,
      type: 'ship',
      position: { x: 0, y: 0 },
      data: {
        kind: 'ship',
        label: s.fullname,
        shipId,
        stype: s.type,
        parentInstanceId: parentInstance,
        parentSide: side,
        level,
      },
    });
    return instanceId;
  };

  const addPack = (
    ownerId: number,
    packKind: 'improve' | 'evolve' | 'develop',
    parentInstance: string,
    parentLevel: number,
    planIndex?: number,
  ): string | null => {
    let stats: ResourcePack | undefined;
    if (packKind === 'improve') {
      stats = getImproveResourcePack(ownerId);
    } else if (packKind === 'develop') {
      stats = getDevelopResourcePack(ownerId);
    } else {
      // evolve pack 按 planIndex 索引；planIndex 缺失时不创建
      if (planIndex == null) return null;
      stats = getEvolveResourcePacksByPlan(ownerId).get(planIndex);
    }
    if (!stats) return null;
    const instanceId = packInstanceId(parentInstance, packKind, planIndex);
    if (nodes.has(instanceId)) return instanceId;
    nodes.set(instanceId, {
      id: instanceId,
      type: 'pack',
      position: { x: 0, y: 0 },
      data: {
        kind: 'pack',
        packKind,
        ownerId,
        stats,
        parentInstanceId: parentInstance,
        parentSide: 'left',
        level: parentLevel + 1,
      },
    });
    return instanceId;
  };

  // 收集某装备在指定方向的所有邻居（按关系类型顺序：进化→改修→进化耗材→任务）
  function collectLeftNeighbors(equipId: number): NeighborEntry[] {
    const result: NeighborEntry[] = [];
    const thisMultiPlan = getImprovementPlans(equipId).length > 1;
    const suffix = (i: number) => (thisMultiPlan ? `·P${i + 1}` : '');

    // 进化来源（A 进化为 B；planIndex 属于 A，suffix 看 A 的方案数）
    for (const { planIndex, sourceId } of getEvolveSources(equipId)) {
      const sourceMulti = getImprovementPlans(sourceId).length > 1;
      const sfx = sourceMulti ? `·P${planIndex + 1}` : '';
      result.push({
        equipId: sourceId,
        kind: 'EVOLVE_UPGRADE',
        label: `进化${sfx}`,
        planIndex,
      });
    }
    // 改修耗材（B 自己改修消耗 C；各方案数据相同，聚合为单条）
    for (const rel of getImproveConsumes(equipId)) {
      result.push({
        equipId: rel.consumerId,
        kind: 'IMPROVE_MATERIAL',
        label: `改修×${rel.totalCount}`,
        amount: rel.totalCount,
      });
    }
    // 进化耗材（B 进化消耗 D；planIndex 属于 B）
    for (const rel of getEvolveConsumesByPlan(equipId)) {
      result.push({
        equipId: rel.consumerId,
        kind: 'EVOLVE_MATERIAL',
        label: `进化×${rel.count}${suffix(rel.planIndex)}`,
        amount: rel.count,
        planIndex: rel.planIndex,
      });
    }
    for (const qid of getQuestsRewardingEquipment(equipId)) {
      result.push({ questId: qid, kind: 'QUEST_REWARD_EQUIP', label: '奖励' });
    }
    for (const shipId of getShipsEquippingEquipment(equipId)) {
      result.push({ shipId, kind: 'SHIP_INITIAL_EQUIP', label: '初始' });
    }
    return result;
  }

  function collectRightNeighbors(equipId: number): NeighborEntry[] {
    const result: NeighborEntry[] = [];
    const thisMultiPlan = getImprovementPlans(equipId).length > 1;
    const suffix = (i: number) => (thisMultiPlan ? `·P${i + 1}` : '');

    // 进化目标（A 进化为 B；planIndex 属于 A）
    for (const { planIndex, targetId } of getEvolveTargets(equipId)) {
      result.push({
        equipId: targetId,
        kind: 'EVOLVE_UPGRADE',
        label: `进化${suffix(planIndex)}`,
        planIndex,
      });
    }
    // 改修耗材被消耗（B 改修时消耗 A；B 各方案消耗相同，聚合为单条）
    for (const rel of getImproveConsumedBy(equipId)) {
      result.push({
        equipId: rel.consumerId,
        kind: 'IMPROVE_MATERIAL',
        label: `改修×${rel.totalCount}`,
        amount: rel.totalCount,
      });
    }
    // 进化耗材被消耗（B 进化时消耗 A；planIndex 属于 B）
    for (const rel of getEvolveConsumedByPlan(equipId)) {
      const sourceMulti = getImprovementPlans(rel.consumerId).length > 1;
      const sfx = sourceMulti ? `·P${rel.planIndex + 1}` : '';
      result.push({
        equipId: rel.consumerId,
        kind: 'EVOLVE_MATERIAL',
        label: `进化×${rel.count}${sfx}`,
        amount: rel.count,
        planIndex: rel.planIndex,
      });
    }
    // 任务废弃此装备（任务消耗装备 → 任务）
    for (const rel of getQuestsScrappingEquipment(equipId)) {
      result.push({
        questId: rel.questId,
        kind: 'QUEST_SCRAP_EQUIP',
        label: `废弃×${rel.amount}`,
        amount: rel.amount,
      });
    }
    // 任务要求持有/装备此装备
    for (const rel of getQuestsRequiringEquipment(equipId)) {
      result.push({
        questId: rel.questId,
        kind: 'QUEST_REQUIRE_EQUIP',
        label: rel.amount > 1 ? `装备×${rel.amount}` : '装备',
        amount: rel.amount,
      });
    }
    return result;
  }

  function countLeftNeighbors(equipId: number): number {
    // 素材包也是 LEFT 子节点，没上游装备但有改修/进化/开发时仍可展开看素材包
    let n = collectLeftNeighbors(equipId).length;
    if (getImproveResourcePack(equipId) != null) n++;
    // 每个 upgrade 方案一个 evolve pack
    n += getEvolveResourcePacksByPlan(equipId).size;
    // 开发理论值包（仅可开发装备有）
    if (getDevelopResourcePack(equipId) != null) n++;
    return n;
  }

  function countRightNeighbors(equipId: number): number {
    return collectRightNeighbors(equipId).length;
  }

  function addSingleNeighbor(
    entry: NeighborEntry,
    parentInstance: string,
    side: 'left' | 'right',
    level: number,
    path: number[],
  ): void {
    if (entry.equipId != null) {
      if (path.includes(entry.equipId)) return;
      const childInst = childInstanceId(entry.equipId, side, parentInstance);
      addEquipmentSubtree(entry.equipId, childInst, parentInstance, side, level + 1, path);
      if (side === 'left') {
        addEdge(childInst, parentInstance, entry.kind, {
          label: entry.label,
          amount: entry.amount,
          side: 'left',
          planIndex: entry.planIndex,
        });
      } else {
        addEdge(parentInstance, childInst, entry.kind, {
          label: entry.label,
          amount: entry.amount,
          side: 'right',
          planIndex: entry.planIndex,
        });
      }
    } else if (entry.questId != null) {
      const qInst = addQuest(entry.questId, parentInstance, side, level + 1);
      if (qInst) {
        if (side === 'left') {
          addEdge(qInst, parentInstance, entry.kind, { label: entry.label, side: 'left' });
        } else {
          addEdge(parentInstance, qInst, entry.kind, { label: entry.label, side: 'right' });
        }
      }
    } else if (entry.shipId != null) {
      const sInst = addShip(entry.shipId, parentInstance, side, level + 1);
      if (sInst) {
        if (side === 'left') {
          addEdge(sInst, parentInstance, entry.kind, { label: entry.label, side: 'left' });
        } else {
          addEdge(parentInstance, sInst, entry.kind, { label: entry.label, side: 'right' });
        }
      }
    }
  }

  function addAggregateNode(
    parentInstance: string,
    side: 'left' | 'right',
    foldedCount: number,
    level: number,
  ): void {
    const instanceId = `agg-${side}-${parentInstance}`;
    if (nodes.has(instanceId)) return;
    nodes.set(instanceId, {
      id: instanceId,
      type: 'aggregate',
      position: { x: 0, y: 0 },
      data: {
        kind: 'aggregate',
        side,
        count: foldedCount,
        expanded: expandedAggregates.has(instanceId),
        parentInstanceId: parentInstance,
        parentSide: side,
        level: level + 1,
      },
    });
    if (side === 'left') {
      addEdge(instanceId, parentInstance, 'AGGREGATE', { label: `+${foldedCount}`, side: 'left' });
    } else {
      addEdge(parentInstance, instanceId, 'AGGREGATE', { label: `+${foldedCount}`, side: 'right' });
    }
  }

  // 递归添加装备及其展开子树
  function addEquipmentSubtree(
    equipId: number,
    instanceId: string,
    parentInstance: string | null,
    side: 'left' | 'right' | 'center',
    level: number,
    path: number[],
  ): void {
    if (path.includes(equipId)) return; // cycle 检测

    addEquipment(equipId, instanceId, parentInstance, side, level);
    pathSet.add(instanceId);

    const expanded = getExpanded(instanceId, side === 'center');
    const newPath = [...path, equipId];

    // LEFT 子树（中心或 LEFT 已展开节点的 LEFT 方向）
    if (expanded.left) {
      // 该节点的改修素材包（聚合所有方案的 0→9★，单一节点）
      const improvePack = addPack(equipId, 'improve', instanceId, level);
      if (improvePack) addEdge(improvePack, instanceId, 'IMPROVE_PACK', { side: 'left' });
      // 进化素材包（每方案一个，跟随 planIndex 区分）
      const plans = getImprovementPlans(equipId);
      const evolveMultiPlan = plans.length > 1;
      for (const plan of plans) {
        if (!plan.evolvePack) continue;
        const evolvePack = addPack(equipId, 'evolve', instanceId, level, plan.planIndex);
        if (evolvePack) {
          addEdge(evolvePack, instanceId, 'EVOLVE_PACK', {
            label: evolveMultiPlan ? `进化素材·P${plan.planIndex + 1}` : undefined,
            side: 'left',
            planIndex: plan.planIndex,
          });
        }
      }
      // 开发理论值包（废弃资源 × 10，对所有装备都可算）
      const developPack = addPack(equipId, 'develop', instanceId, level);
      if (developPack) addEdge(developPack, instanceId, 'DEVELOP_PACK', { side: 'left' });

      addLeftNeighbors(equipId, instanceId, level, newPath);
    }

    // RIGHT 子树
    if (expanded.right) {
      addRightNeighbors(equipId, instanceId, level, newPath);
    }
  }

  function addLeftNeighbors(
    equipId: number,
    parentInstance: string,
    level: number,
    path: number[],
  ): void {
    const all = collectLeftNeighbors(equipId).filter((n) => {
      const id = n.equipId ?? n.questId ?? n.shipId;
      return id != null && !path.includes(id);
    });

    const aggregateId = `agg-left-${parentInstance}`;
    const isAggExpanded = expandedAggregates.has(aggregateId);

    let visible: NeighborEntry[];
    if (all.length > FOLD_THRESHOLD && !isAggExpanded) {
      visible = all.slice(0, FOLD_THRESHOLD);
    } else {
      visible = all;
    }

    for (const entry of visible) {
      addSingleNeighbor(entry, parentInstance, 'left', level, path);
    }

    if (all.length > FOLD_THRESHOLD && !isAggExpanded) {
      addAggregateNode(parentInstance, 'left', all.length - FOLD_THRESHOLD, level);
    }
  }

  function addRightNeighbors(
    equipId: number,
    parentInstance: string,
    level: number,
    path: number[],
  ): void {
    const all = collectRightNeighbors(equipId).filter((n) => {
      const id = n.equipId ?? n.questId ?? n.shipId;
      return id != null && !path.includes(id);
    });

    const aggregateId = `agg-right-${parentInstance}`;
    const isAggExpanded = expandedAggregates.has(aggregateId);

    let visible: NeighborEntry[];
    if (all.length > FOLD_THRESHOLD && !isAggExpanded) {
      visible = all.slice(0, FOLD_THRESHOLD);
    } else {
      visible = all;
    }

    for (const entry of visible) {
      addSingleNeighbor(entry, parentInstance, 'right', level, path);
    }

    if (all.length > FOLD_THRESHOLD && !isAggExpanded) {
      addAggregateNode(parentInstance, 'right', all.length - FOLD_THRESHOLD, level);
    }
  }

  // 从中心开始构建
  const cId = centerInstanceId(centerId);
  addEquipmentSubtree(centerId, cId, null, 'center', 0, []);

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}
