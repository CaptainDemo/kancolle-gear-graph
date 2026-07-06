import { useMemo } from 'react';
import { create } from 'zustand';

import { getAllEquipments, isImprovable } from '../data/loader';

interface ExpandedState {
  left: boolean;
  right: boolean;
}

interface AppState {
  keyword: string;
  selectedTypeIds: Set<number>;
  minRarity: number;
  improvableOnly: boolean;

  selectedEquipId: number | null;
  expandedPacks: Set<string>;
  expandedNodes: Map<string, ExpandedState>;
  expandedAggregates: Set<string>;

  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  setKeyword: (kw: string) => void;
  toggleTypeId: (id: number) => void;
  clearTypeIds: () => void;
  setMinRarity: (r: number) => void;
  setImprovableOnly: (b: boolean) => void;

  selectEquipment: (id: number | null) => void;
  togglePack: (packInstanceId: string) => void;
  toggleNodeSide: (instanceId: string, side: 'left' | 'right') => void;
  toggleAggregate: (aggregateInstanceId: string) => void;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useStore = create<AppState>((set) => ({
  keyword: '',
  selectedTypeIds: new Set(),
  minRarity: 0,
  improvableOnly: false,

  selectedEquipId: null,
  expandedPacks: new Set(),
  expandedNodes: new Map(),
  expandedAggregates: new Set(),

  leftPanelOpen: true,
  rightPanelOpen: true,

  setKeyword: (kw) => set({ keyword: kw }),
  toggleTypeId: (id) =>
    set((state) => {
      const next = new Set(state.selectedTypeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedTypeIds: next };
    }),
  clearTypeIds: () => set({ selectedTypeIds: new Set() }),
  setMinRarity: (r) => set({ minRarity: r }),
  setImprovableOnly: (b) => set({ improvableOnly: b }),

  selectEquipment: (id) =>
    set({
      selectedEquipId: id,
      expandedPacks: new Set(),
      expandedNodes: id != null
        ? new Map([[`eq-${id}-c`, { left: true, right: true }]])
        : new Map(),
      expandedAggregates: new Set(),
      rightPanelOpen: id != null,
    }),

  togglePack: (packInstanceId) =>
    set((state) => {
      const next = new Set(state.expandedPacks);
      if (next.has(packInstanceId)) next.delete(packInstanceId);
      else next.add(packInstanceId);
      return { expandedPacks: next };
    }),

  toggleNodeSide: (instanceId, side) =>
    set((state) => {
      const next = new Map(state.expandedNodes);
      const current = next.get(instanceId) ?? { left: false, right: false };
      next.set(instanceId, { ...current, [side]: !current[side] });
      return { expandedNodes: next };
    }),

  toggleAggregate: (aggregateInstanceId) =>
    set((state) => {
      const next = new Set(state.expandedAggregates);
      if (next.has(aggregateInstanceId)) next.delete(aggregateInstanceId);
      else next.add(aggregateInstanceId);
      return { expandedAggregates: next };
    }),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));

export const useFilteredEquipments = () => {
  const keyword = useStore((s) => s.keyword);
  const selectedTypeIds = useStore((s) => s.selectedTypeIds);
  const minRarity = useStore((s) => s.minRarity);
  const improvableOnly = useStore((s) => s.improvableOnly);

  return useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return getAllEquipments().filter((eq) => {
      if (eq.rarity < minRarity) return false;
      if (selectedTypeIds.size > 0 && !selectedTypeIds.has(eq.typeId)) return false;
      if (improvableOnly && !isImprovable(eq.id)) return false;
      if (kw) {
        const inName = eq.name.toLowerCase().includes(kw);
        const inId = String(eq.id).includes(kw);
        if (!inName && !inId) return false;
      }
      return true;
    });
  }, [keyword, selectedTypeIds, minRarity, improvableOnly]);
};
