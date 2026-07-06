import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from '@xyflow/react';

import { buildEquipmentTree, type GraphEdge, type GraphNode, type GraphNodeData } from '../data/graph';
import { layoutBidirectional } from '../data/layout';
import { useStore } from '../store/useStore';
import { getEquipment, getTypeName } from '../data/loader';
import { EDGE_STYLES } from '../lib/constants';
import type { EdgeKind } from '../lib/constants';
import { EquipmentNode } from './nodes/EquipmentNode';
import { QuestNode } from './nodes/QuestNode';
import { PackNode } from './nodes/PackNode';
import { ResourceNode } from './nodes/ResourceNode';
import { AggregateNode } from './nodes/AggregateNode';
import { LabeledEdge } from './edges/LabeledEdge';

const nodeTypes = {
  equipment: EquipmentNode,
  quest: QuestNode,
  pack: PackNode,
  resource: ResourceNode,
  aggregate: AggregateNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

interface GraphEdgeData {
  kind: EdgeKind;
  label?: string;
  amount?: number;
}

// 平行边优先级：数字越小优先级越高，单条边走默认水平路径
// 改修耗材是最常见关系，让它走默认水平；进化（较少见）绕顶部曲线
const EDGE_PRIORITY: Record<EdgeKind, number> = {
  IMPROVE_MATERIAL: 0,
  EVOLVE_UPGRADE: 1,
  EVOLVE_MATERIAL: 2,
  QUEST_REWARD_EQUIP: 3,
  IMPROVE_PACK: 4,
  EVOLVE_PACK: 5,
  PACK_RESOURCE: 6,
  QUEST_REWARD_RESOURCE: 7,
  QUEST_CONSUME_RESOURCE: 8,
  DISMANTLE: 9,
  AGGREGATE: 10,
  QUEST_SCRAP_EQUIP: 11,
  QUEST_REQUIRE_EQUIP: 12,
};

// 多边扇形分配：默认 → 上方 → 下方 → 上上 → 下下（多方案装备可能产生 3+ 平行边）
// 超出 5 路时回到默认水平（会与第 1 条重叠，可接受）
const PARALLEL_HANDLES: Array<{ source?: string; target?: string } | undefined> = [
  undefined, // 1st: 默认水平
  { source: 's-top', target: 't-top' }, // 2nd: 上方曲线
  { source: 's-bot', target: 't-bot' }, // 3rd: 下方曲线
  { source: 's-top', target: 't-top' }, // 4th: 上方曲线（与 2nd 同 handle，curvature 不同时仍重叠）
  { source: 's-bot', target: 't-bot' }, // 5th: 下方曲线（与 3rd 同 handle）
];

function styleSingleEdge(edge: GraphEdge): GraphEdge {
  const data = edge.data as GraphEdgeData | undefined;
  const kind = (data?.kind ?? 'IMPROVE_PACK') as EdgeKind;
  const style = EDGE_STYLES[kind];
  return {
    ...edge,
    type: 'labeled',
    animated: kind === 'EVOLVE_UPGRADE',
    label: data?.label ?? style.label,
    data: { ...data, kind },
    style: {
      stroke: style.color,
      strokeWidth: 1.5,
      strokeDasharray: style.dashed ? '4 2' : undefined,
    },
  };
}

function styleEdges(edges: GraphEdge[]): GraphEdge[] {
  // 按 (source, target) 分组检测平行边
  const groups = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const key = `${e.source}->${e.target}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const result: GraphEdge[] = [];
  for (const group of groups.values()) {
    // 按优先级排序
    group.sort((a, b) => {
      const ka = ((a.data as GraphEdgeData)?.kind ?? 'IMPROVE_PACK') as EdgeKind;
      const kb = ((b.data as GraphEdgeData)?.kind ?? 'IMPROVE_PACK') as EdgeKind;
      return EDGE_PRIORITY[ka] - EDGE_PRIORITY[kb];
    });

    group.forEach((edge, i) => {
      const styled = styleSingleEdge(edge);
      const handles = group.length > 1 ? PARALLEL_HANDLES[i] : undefined;
      result.push({
        ...styled,
        sourceHandle: handles?.source,
        targetHandle: handles?.target,
      });
    });
  }

  return result;
}

export function RelationshipGraph() {
  const selectedId = useStore((s) => s.selectedEquipId);
  const expandedPacks = useStore((s) => s.expandedPacks);
  const expandedNodes = useStore((s) => s.expandedNodes);
  const expandedAggregates = useStore((s) => s.expandedAggregates);
  const togglePack = useStore((s) => s.togglePack);
  const selectEquipment = useStore((s) => s.selectEquipment);

  const built = useMemo(() => {
    if (selectedId == null) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
    return buildEquipmentTree(selectedId, expandedPacks, expandedNodes, expandedAggregates);
  }, [selectedId, expandedPacks, expandedNodes, expandedAggregates]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const instanceRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    setNodes(layoutBidirectional(built.nodes));
    setEdges(styleEdges(built.edges));
  }, [built, setNodes, setEdges]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      instanceRef.current?.fitView({ padding: 0.25, maxZoom: 1.4 });
    }, 60);
    return () => window.clearTimeout(t);
  }, [built]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const d = node.data as GraphNodeData;
      if (d.kind === 'pack') {
        togglePack(node.id);
      }
    },
    [togglePack],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const d = node.data as GraphNodeData;
      if (d.kind === 'equipment' && d.equipmentId != null) {
        selectEquipment(d.equipmentId);
      }
    },
    [selectEquipment],
  );

  const handleFit = useCallback(() => {
    instanceRef.current?.fitView({ padding: 0.25, maxZoom: 1.4 });
  }, []);

  const counts = useMemo(() => {
    const c = { equipment: 0, quest: 0, pack: 0, resource: 0 };
    for (const n of built.nodes) c[n.data.kind as keyof typeof c]++;
    return c;
  }, [built]);

  if (selectedId == null) return null;
  const center = getEquipment(selectedId);

  return (
    <div className="graph-pane">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onInit={(inst) => (instanceRef.current = inst)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.4 }}
        minZoom={0.15}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="graph-toolbar">
        <button onClick={handleFit} title="将所有节点居中并缩放到可见">
          居中
        </button>
      </div>

      <div className="graph-overlay">
        中心：{center?.name ?? `#${selectedId}`}
        {center && ` · ${getTypeName(center.typeId)}`} · 装备 {counts.equipment} · 任务 {counts.quest} · 素材包 {counts.pack} · 资源 {counts.resource}
      </div>

      <div className="graph-legend">
        <div className="legend-row">
          <span className="swatch" style={{ background: '#ffd54f' }}></span>
          <span>进化升级</span>
        </div>
        <div className="legend-row">
          <span className="swatch" style={{ background: '#ef5350' }}></span>
          <span>改修耗材</span>
        </div>
        <div className="legend-row">
          <span className="swatch" style={{ background: '#ff7043' }}></span>
          <span>进化耗材</span>
        </div>
        <div className="legend-row">
          <span className="swatch" style={{ background: '#90a4ae' }}></span>
          <span>素材包</span>
        </div>
        <div className="legend-row">
          <span className="swatch" style={{ background: '#42a5f5' }}></span>
          <span>任务奖励</span>
        </div>
      </div>
    </div>
  );
}
