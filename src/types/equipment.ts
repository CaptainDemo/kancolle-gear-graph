export interface RawSlotItem {
  api_id: number;
  api_name: string;
  api_sortno: number;
  api_type: [number, number, number, number, number];
  api_rare: number;
  api_houg: number;
  api_raig: number;
  api_tyku: number;
  api_souk: number;
  api_tais: number;
  api_houm: number;
  api_houk: number;
  api_saku: number;
  api_luck: number;
  api_baku: number;
  api_leng: number;
  api_broken: [number, number, number, number];
  api_cost?: number;
  api_distance?: number;
  api_version?: number;
  [key: string]: unknown;
}

export interface RawEquipType {
  api_id: number;
  api_name: string;
  api_show_flg: number;
}

export interface EquipmentStats {
  houg: number;
  raig: number;
  tyku: number;
  souk: number;
  tais: number;
  houm: number;
  houk: number;
  saku: number;
  luck: number;
  baku: number;
}

export interface Equipment {
  id: number;
  name: string;
  sortno: number;
  typeId: number;
  iconTypeId: number;
  rarity: number;
  stats: EquipmentStats;
  broken: [number, number, number, number];
  cost?: number;
  distance?: number;
  range: number;
}

export interface EquipmentFilter {
  keyword: string;
  typeIds: Set<number>;
  minRarity: number;
  improvableOnly: boolean;
}
