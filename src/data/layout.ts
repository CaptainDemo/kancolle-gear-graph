import type { Node } from '@xyflow/react';

import type { GraphNode, GraphNodeData } from './graph';

const INNER_GAP = 110;
const NODE_GAP = 12;

const NODE_SIZES: Record<string, { w: number; h: number }> = {
  equipment: { w: 180, h: 44 },
  quest: { w: 180, h: 56 },
  pack: { w: 230, h: 70 },
  aggregate: { w: 130, h: 36 },
};

function sizeOf(kind: string): { w: number; h: number } {
  return NODE_SIZES[kind] ?? NODE_SIZES.equipment!;
}

const CENTER_HALF_H = NODE_SIZES.equipment.h / 2; // 22

interface YRange {
  top: number;
  bottom: number;
}

/**
 * 双向树形布局：
 * - 中心节点 Y 固定 = rangeCenter（与同列兄弟对齐）
 * - 内侧 LEFT 子节点 stack 居中于父节点 Y（不偏离）
 * - 通过 center 的"上下分组堆叠"保证 stack 不重叠 center：
 *   RIGHT 子节点按奇偶 index 分上下两组，上方组从 center 顶之上往远堆叠，下方组从 center 底之下往远堆叠
 *   每个节点占用 max(ownH, inH) Y 空间，自动留出 stack 所需的 Y 范围
 */
export function layoutBidirectional(nodes: GraphNode[]): Node[] {
  const childrenMap = new Map<string, GraphNode[]>();
  const allMap = new Map<string, GraphNode>();
  let centerNode: GraphNode | null = null;

  for (const n of nodes) {
    allMap.set(n.id, n);
    const d = n.data as GraphNodeData;
    if (d.kind === 'equipment' && d.isCenter) {
      centerNode = n;
    } else if (d.parentInstanceId) {
      const list = childrenMap.get(d.parentInstanceId) ?? [];
      list.push(n);
      childrenMap.set(d.parentInstanceId, list);
    }
  }

  if (!centerNode) {
    return nodes.map((n, i) => ({ ...n, position: { x: i * 250, y: 0 } }));
  }

  const positioned = new Map<string, { x: number; y: number }>();
  const centerW = sizeOf('equipment').w;

  function subtreeHeight(nodeId: string, outwardSide: 'left' | 'right'): number {
    const node = allMap.get(nodeId)!;
    const data = node.data as GraphNodeData;
    const kind = data.kind;
    const ownH = sizeOf(kind).h;
    const isCenter = kind === 'equipment' && data.isCenter;

    const outChildren = (childrenMap.get(nodeId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === outwardSide,
    );
    const outH =
      outChildren.length === 0
        ? 0
        : outChildren.reduce((sum, c) => sum + subtreeHeight(c.id, outwardSide), 0);

    if (isCenter) {
      const otherSide = outwardSide === 'left' ? 'right' : 'left';
      const otherChildren = (childrenMap.get(nodeId) ?? []).filter(
        (c) => (c.data as GraphNodeData).parentSide === otherSide,
      );
      const otherH =
        otherChildren.length === 0
          ? 0
          : otherChildren.reduce((sum, c) => sum + subtreeHeight(c.id, otherSide), 0);
      // center 总高度 = max(两侧) + centerH + 余量
      const childSum = Math.max(outH, otherH);
      const numChildren = Math.max(outChildren.length, otherChildren.length);
      return childSum + numChildren * NODE_GAP + ownH * 2 + NODE_GAP * 4;
    }

    const innerSide = outwardSide === 'left' ? 'right' : 'left';
    const inChildren = (childrenMap.get(nodeId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === innerSide,
    );
    const inH =
      inChildren.length === 0
        ? 0
        : inChildren.reduce((sum, c) => sum + subtreeHeight(c.id, outwardSide), 0);

    if (inChildren.length === 0) {
      return ownH + NODE_GAP + outH;
    }
    // 有内侧 stack：节点 + stack 共享 Y 范围，大小 = max(ownH, inH)
    const clusterH = Math.max(ownH, inH);
    return Math.max(clusterH, outH) + NODE_GAP;
  }

  function layoutNode(nodeId: string, xLeft: number, yTop: number, yBottom: number): YRange[] {
    const node = allMap.get(nodeId)!;
    const data = node.data as GraphNodeData;
    const kind = data.kind;
    const w = sizeOf(kind).w;
    const h = sizeOf(kind).h;
    const rangeCenter = (yTop + yBottom) / 2;

    const isCenter = kind === 'equipment' && data.isCenter;
    const parentSide = data.parentSide;

    const leftChildren = (childrenMap.get(nodeId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === 'left',
    );
    const rightChildren = (childrenMap.get(nodeId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === 'right',
    );

    const allChildRanges: YRange[] = [];

    if (leftChildren.length > 0) {
      const isOutward = isCenter || parentSide === 'left';
      const ranges = isOutward
        ? layoutOutward(nodeId, 'left', xLeft, yTop, yBottom, !!isCenter)
        : layoutInner(nodeId, 'left', xLeft, rangeCenter);
      allChildRanges.push(...ranges);
    }

    if (rightChildren.length > 0) {
      const isOutward = isCenter || parentSide === 'right';
      const ranges = isOutward
        ? layoutOutward(nodeId, 'right', xLeft + w, yTop, yBottom, !!isCenter)
        : layoutInner(nodeId, 'right', xLeft + w, rangeCenter);
      allChildRanges.push(...ranges);
    }

    // 节点 Y 固定在 rangeCenter（不跟 stack 跑）
    positioned.set(nodeId, { x: xLeft, y: rangeCenter - h / 2 });
    return [{ top: rangeCenter - h / 2, bottom: rangeCenter + h / 2 }];
  }

  function layoutOutward(
    parentId: string,
    side: 'left' | 'right',
    parentEdgeX: number,
    yTop: number,
    yBottom: number,
    isFromCenter: boolean,
  ): YRange[] {
    const children = (childrenMap.get(parentId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === side,
    );
    if (children.length === 0) return [];

    const ranges: YRange[] = [];
    const childXLeftOf = (childKind: string) =>
      side === 'left' ? parentEdgeX - INNER_GAP - sizeOf(childKind).w : parentEdgeX + INNER_GAP;

    if (isFromCenter) {
      // 中心节点的 outward 子节点：上下分组堆叠（从 center 上下两侧远离堆叠）
      // 保证每个子节点的 LEFT stack 不与 center 重叠
      const upperChildren = children.filter((_, i) => i % 2 === 0);
      const lowerChildren = children.filter((_, i) => i % 2 === 1);

      let curYBottom = -CENTER_HALF_H - NODE_GAP;
      for (let i = upperChildren.length - 1; i >= 0; i--) {
        const child = upperChildren[i]!;
        const subH = subtreeHeight(child.id, side);
        const childYTop = curYBottom - subH;
        const childYBottom = curYBottom;
        const childRanges = layoutNode(child.id, childXLeftOf((child.data as GraphNodeData).kind), childYTop, childYBottom);
        ranges.push(...childRanges);
        curYBottom = childYTop - NODE_GAP;
      }

      let curYTop = CENTER_HALF_H + NODE_GAP;
      for (const child of lowerChildren) {
        const subH = subtreeHeight(child.id, side);
        const childYTop = curYTop;
        const childYBottom = curYTop + subH;
        const childRanges = layoutNode(child.id, childXLeftOf((child.data as GraphNodeData).kind), childYTop, childYBottom);
        ranges.push(...childRanges);
        curYTop = childYBottom + NODE_GAP;
      }
      return ranges;
    }

    // 非中心节点的 outward 子节点：按比例分配父节点的 Y 范围（标准树布局）
    const totalSubtreeH = children.reduce((sum, c) => sum + subtreeHeight(c.id, side), 0);
    if (totalSubtreeH <= 0) return [];

    const rangeH = yBottom - yTop;
    let curY = yTop;
    for (const child of children) {
      const subH = subtreeHeight(child.id, side);
      const childRangeH = (subH / totalSubtreeH) * rangeH;
      const childRanges = layoutNode(
        child.id,
        childXLeftOf((child.data as GraphNodeData).kind),
        curY,
        curY + childRangeH,
      );
      ranges.push(...childRanges);
      curY += childRangeH;
    }
    return ranges;
  }

  function layoutInner(
    parentId: string,
    side: 'left' | 'right',
    parentEdgeX: number,
    rangeCenter: number,
  ): YRange[] {
    const children = (childrenMap.get(parentId) ?? []).filter(
      (c) => (c.data as GraphNodeData).parentSide === side,
    );
    if (children.length === 0) return [];

    const totalSubH = children.reduce((sum, c) => sum + subtreeHeight(c.id, side), 0);
    if (totalSubH <= 0) return [];

    // stack 居中于父节点 rangeCenter
    const finalStackTop = rangeCenter - totalSubH / 2;
    let curY = finalStackTop;
    const ranges: YRange[] = [];

    for (const child of children) {
      const subH = subtreeHeight(child.id, side);
      const childYTop = curY;
      const childYBottom = curY + subH;
      const childKind = (child.data as GraphNodeData).kind;
      const childW = sizeOf(childKind).w;
      const childXLeft =
        side === 'left' ? parentEdgeX - INNER_GAP - childW : parentEdgeX + INNER_GAP;
      const childRanges = layoutNode(child.id, childXLeft, childYTop, childYBottom);
      ranges.push(...childRanges);
      curY = childYBottom;
    }
    return ranges;
  }

  // 启动
  const leftTotal = subtreeHeight(centerNode.id, 'left');
  const rightTotal = subtreeHeight(centerNode.id, 'right');
  const totalH = Math.max(leftTotal, rightTotal, 400);
  layoutNode(centerNode.id, -centerW / 2, -totalH / 2, totalH / 2);

  for (const n of nodes) {
    if (!positioned.has(n.id)) {
      positioned.set(n.id, { x: 0, y: 0 });
    }
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) ?? { x: 0, y: 0 },
  }));
}
