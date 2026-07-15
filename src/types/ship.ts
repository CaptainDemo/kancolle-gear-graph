export interface ShipName {
  ja_jp: string;
  zh_cn: string;
}

export interface Ship {
  id: number;
  name: ShipName;
  fullname: string; // 来自 api_start2 api_name，含"改"/"改二"等后缀
  type: number; // api_stype（舰型 ID，1=DE、2=DD…）
  class?: number;
  equip: number[]; // 初始装备 ID 列表（已过滤空槽）
}
