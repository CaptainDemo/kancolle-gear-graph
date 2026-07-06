export interface QuestRewardOther {
  name: string;
  category: string;
  amount: number;
}

export interface QuestRequirementItem {
  name: string;
  amount?: number;
}

export interface QuestRequirements {
  category?: string;
  scraps?: QuestRequirementItem[];
  equipments?: QuestRequirementItem[];
  equipment?: string;
  [key: string]: unknown;
}

export interface RawQuest {
  game_id: number;
  wiki_id: string;
  category: number;
  type: number;
  name: string;
  detail: string;
  reward_fuel: number;
  reward_ammo: number;
  reward_steel: number;
  reward_bauxite: number;
  reward_other: QuestRewardOther[];
  prerequisite: number[];
  requirements: QuestRequirements;
}

export interface QuestRewards {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
  other: QuestRewardOther[];
}

export interface Quest {
  id: number;
  wikiId: string;
  category: number;
  name: string;
  detail: string;
  rewards: QuestRewards;
  prerequisite: number[];
  requirements: QuestRequirements;
}
