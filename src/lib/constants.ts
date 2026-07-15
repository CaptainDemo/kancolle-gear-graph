import type { EquipmentStats } from '../types/equipment';
import type { ResourcePack } from '../types/improvement';

export type ResourceKey = keyof ResourcePack;

export const RARITY_NAMES = [
  'コモン',
  'レア',
  'ホロ',
  'Sホロ',
  'SSホロ',
  'SSR',
  'SSR+',
  'SSR++',
];

export const RARITY_COLORS = [
  '#9e9e9e',
  '#42a5f5',
  '#66bb6a',
  '#ffa726',
  '#ef5350',
  '#ab47bc',
  '#7e57c2',
  '#26a69a',
];

export const RARITY_BG = [
  'rgba(158,158,158,0.15)',
  'rgba(66,165,245,0.15)',
  'rgba(102,187,106,0.15)',
  'rgba(255,167,38,0.15)',
  'rgba(239,83,80,0.15)',
  'rgba(171,71,188,0.15)',
  'rgba(126,87,194,0.15)',
  'rgba(38,166,154,0.15)',
];

export const MATERIAL_IDS = {
  fuel: '燃料',
  ammo: '弾薬',
  steel: '鋼材',
  bauxite: 'ボーキ',
  screw: '改修資材',
  devmat: '開発資材',
} as const;

export type MaterialId = keyof typeof MATERIAL_IDS;

export const KC3KAI_ICON_BASE =
  'https://raw.githubusercontent.com/KC3Kai/KC3Kai/master/src/assets/img/items';

export const iconUrl = (iconTypeId: number): string =>
  `${KC3KAI_ICON_BASE}/${iconTypeId}.png`;

export const QUEST_CATEGORIES: Record<number, string> = {
  1: '編成',
  2: '出撃',
  3: '演習',
  4: '遠征',
  5: '補給入渠',
  6: '工廠',
  7: '改装',
  8: '近代化改修',
  9: '出撃(続)',
  10: '他',
};

export const STAT_LABELS: Record<keyof EquipmentStats, string> = {
  houg: '火力',
  raig: '雷装',
  tyku: '対空',
  souk: '装甲',
  tais: '対潜',
  houm: '命中',
  houk: '回避',
  saku: '索敵',
  luck: '運',
  baku: '爆装',
};

export const RANGE_LABELS = ['—', '短', '中', '長', '超長'];

// ============================================================================
// 图谱边类型
// ============================================================================

export type EdgeKind =
  | 'EVOLVE_UPGRADE' // 装备 → 装备（A 进化为 B）
  | 'IMPROVE_MATERIAL' // 装备 → 装备（被吃 → 吃方，改修耗材）
  | 'EVOLVE_MATERIAL' // 装备 → 装备（被吃 → 吃方，进化耗材）
  | 'QUEST_REWARD_EQUIP' // 任务 → 装备（任务奖励装备）
  | 'QUEST_SCRAP_EQUIP' // 装备 → 任务（任务废弃此装备）
  | 'QUEST_REQUIRE_EQUIP' // 装备 → 任务（任务要求持有/装备此装备）
  | 'IMPROVE_PACK' // 改修素材包 → 装备
  | 'EVOLVE_PACK' // 进化素材包 → 装备
  | 'PACK_RESOURCE' // 资源叶子 → 素材包
  | 'QUEST_REWARD_RESOURCE' // 任务 → 资源（任务奖励资源）
  | 'QUEST_CONSUME_RESOURCE' // 资源 → 任务（任务消耗资源）
  | 'DISMANTLE' // 装备 → 资源（拆解产出）
  | 'SHIP_INITIAL_EQUIP' // 舰船 → 装备（舰娘初始装备）
  | 'AGGREGATE'; // 聚合占位符节点 → 父节点（虚拟边）

export interface EdgeStyle {
  color: string;
  label: string;
  dashed?: boolean;
}

export const EDGE_STYLES: Record<EdgeKind, EdgeStyle> = {
  EVOLVE_UPGRADE: { color: '#ffd54f', label: '进化' },
  IMPROVE_MATERIAL: { color: '#ef5350', label: '改修耗材' },
  EVOLVE_MATERIAL: { color: '#ff7043', label: '进化耗材' },
  QUEST_REWARD_EQUIP: { color: '#42a5f5', label: '任务产出' },
  QUEST_SCRAP_EQUIP: { color: '#ef5350', label: '废弃' },
  QUEST_REQUIRE_EQUIP: { color: '#ffa726', label: '装备' },
  IMPROVE_PACK: { color: '#90a4ae', label: '改修素材' },
  EVOLVE_PACK: { color: '#78909c', label: '进化素材' },
  PACK_RESOURCE: { color: '#607d8b', label: '', dashed: true },
  QUEST_REWARD_RESOURCE: { color: '#26a69a', label: '奖励' },
  QUEST_CONSUME_RESOURCE: { color: '#ab47bc', label: '消耗' },
  DISMANTLE: { color: '#616161', label: '拆解', dashed: true },
  SHIP_INITIAL_EQUIP: { color: '#26c6da', label: '初始' },
  AGGREGATE: { color: '#475569', label: '更多', dashed: true },
};

// 资源视觉
export const RESOURCE_META: Record<ResourceKey, { label: string; color: string }> = {
  fuel: { label: '燃', color: '#4caf50' },
  ammo: { label: '弾', color: '#ffc107' },
  steel: { label: '鋼', color: '#9e9e9e' },
  bauxite: { label: 'ボ', color: '#ff7043' },
  screw: { label: '螺', color: '#7c9882' },
  devmat: { label: '資', color: '#5b8def' },
};

export const RESOURCE_KEYS: ResourceKey[] = ['fuel', 'ammo', 'steel', 'bauxite', 'screw', 'devmat'];
