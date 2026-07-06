import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { useFilteredEquipments, useStore } from '../store/useStore';
import { EquipIcon } from './EquipIcon';
import { RarityBadge } from './RarityBadge';

export function EquipmentList() {
  const equipments = useFilteredEquipments();
  const selectedId = useStore((s) => s.selectedEquipId);
  const select = useStore((s) => s.selectEquipment);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: equipments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });

  return (
    <>
      <div className="pane-header">
        <span>装备列表</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{equipments.length} 件</span>
      </div>
      <div
        ref={parentRef}
        className="pane-body scrollbar equip-list"
        style={{ contain: 'strict' }}
      >
        {equipments.length === 0 ? (
          <div className="empty-state">无匹配装备</div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const eq = equipments[vi.index]!;
              return (
                <div
                  key={eq.id}
                  className={`equip-row ${selectedId === eq.id ? 'active' : ''}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                  }}
                  onClick={() => select(eq.id)}
                >
                  <EquipIcon iconTypeId={eq.iconTypeId} size={24} />
                  <span className="equip-name">{eq.name}</span>
                  <RarityBadge rarity={eq.rarity} />
                  <span className="equip-id">#{eq.id}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
