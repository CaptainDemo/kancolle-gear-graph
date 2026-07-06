export interface ImprovementItem {
  icon: number;
  name: string;
  id: number;
  count: number;
}

export interface ImprovementMaterial {
  development: [number, number];
  improvement: [number, number];
  item: ImprovementItem;
}

export interface ImprovementUpgrade {
  level: number;
  id: number;
  name: string;
  icon: number;
}

export interface ImprovementReq {
  day: boolean[];
  secretary: string[];
  secretaryIds: number[];
}

export interface ImprovementConsume {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
  material: ImprovementMaterial[];
}

export interface ImprovementEntry {
  upgrade?: ImprovementUpgrade;
  req: ImprovementReq[];
  consume: ImprovementConsume;
}

export interface RawImprovementItem {
  id: number;
  id_str: string;
  type: string;
  icon: number;
  name: string;
  improvement: ImprovementEntry[];
}

export type ImprovementData = Record<string, RawImprovementItem>;

export interface ResourcePack {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
  screw: number;
  devmat: number;
}

export interface ResourcePackWithEquipment extends ResourcePack {
  equipment: Map<number, number>;
}

export interface ImproveConsumeRelation {
  consumerId: number;
  totalCount: number;
}

export interface EvolveConsumeRelation {
  consumerId: number;
  count: number;
}

// 同对 (consumer, consumed) 在某套方案下的进化消耗
export interface EvolveConsumePlanRelation {
  planIndex: number;
  consumerId: number;
  count: number;
}

// 进化关系（一对多）：一个装备在不同方案下可进化为不同目标
export interface EvolveRelation {
  planIndex: number;
  targetId: number;
}

// 反向进化关系（多对一）：一个装备可由多个源装备进化而来
export interface EvolveSourceRelation {
  planIndex: number;
  sourceId: number;
}

// 单套 improvement 方案的衍生数据
export interface ImprovementPlan {
  planIndex: number;
  upgradeTargetId?: number; // 此方案的 upgrade 目标（若有）
  improvePack: ResourcePack; // 0→9★（有 upgrade）或 0→★max（无 upgrade）
  evolvePack: ResourcePack | null; // stage 2，仅当有 upgrade
  // 此方案的改修耗材（仅 stages 0+1 的装备消耗）
  improveConsumes: ImproveConsumeRelation[];
  // 此方案的进化耗材（stage 2 的装备消耗，通常含 upgrade 目标）
  evolveConsumes: EvolveConsumeRelation[];
  selfConsume: { improve: number; evolve: number };
}
