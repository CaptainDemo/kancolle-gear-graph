import { useState } from 'react';
import { useStore } from '../store/useStore';
import { getAllTypeIds, getTypeName } from '../data/loader';
import { RARITY_NAMES } from '../lib/constants';

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, extra, children }: SectionProps) {
  return (
    <div className="filter-section">
      <h4 className="filter-section-title">
        <button
          className="filter-collapse-btn"
          onClick={onToggle}
          aria-expanded={open}
          title={open ? '收起' : '展开'}
        >
          <span className="filter-arrow">{open ? '▾' : '▸'}</span>
          {title}
        </button>
        {extra}
      </h4>
      {open && children}
    </div>
  );
}

export function FilterBar() {
  const selected = useStore((s) => s.selectedTypeIds);
  const toggle = useStore((s) => s.toggleTypeId);
  const clear = useStore((s) => s.clearTypeIds);
  const minRarity = useStore((s) => s.minRarity);
  const setMinRarity = useStore((s) => s.setMinRarity);
  const improvableOnly = useStore((s) => s.improvableOnly);
  const setImprovableOnly = useStore((s) => s.setImprovableOnly);

  const [openTypes, setOpenTypes] = useState(true);
  const [openRarity, setOpenRarity] = useState(true);
  const [openOther, setOpenOther] = useState(true);

  const typeIds = getAllTypeIds();

  return (
    <>
      <Section
        title="装备类型"
        open={openTypes}
        onToggle={() => setOpenTypes((v) => !v)}
        extra={
          selected.size > 0 ? (
            <button
              onClick={clear}
              style={{ fontSize: 10, padding: '1px 6px' }}
              title="清除全部类型筛选"
            >
              清除
            </button>
          ) : null
        }
      >
        <div className="filter-chips scrollbar">
          {typeIds.map((id) => (
            <button
              key={id}
              className={`chip ${selected.has(id) ? 'active' : ''}`}
              onClick={() => toggle(id)}
              title={`typeId=${id}`}
            >
              {getTypeName(id)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="最低稀有度" open={openRarity} onToggle={() => setOpenRarity((v) => !v)}>
        <select value={minRarity} onChange={(e) => setMinRarity(Number(e.target.value))}>
          {RARITY_NAMES.map((name, i) => (
            <option key={i} value={i}>
              {'★'.repeat(i) || '★0'} {name}
            </option>
          ))}
        </select>
      </Section>

      <Section title="其它" open={openOther} onToggle={() => setOpenOther((v) => !v)}>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={improvableOnly}
              onChange={(e) => setImprovableOnly(e.target.checked)}
            />
            仅显示可改修
          </label>
        </div>
      </Section>
    </>
  );
}
