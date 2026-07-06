import { useStore } from '../store/useStore';
import { getEquipmentCount } from '../data/loader';

export function TopBar() {
  const keyword = useStore((s) => s.keyword);
  const setKeyword = useStore((s) => s.setKeyword);
  const toggleLeft = useStore((s) => s.toggleLeftPanel);
  const toggleRight = useStore((s) => s.toggleRightPanel);
  const leftOpen = useStore((s) => s.leftPanelOpen);
  const rightOpen = useStore((s) => s.rightPanelOpen);

  return (
    <header className="topbar">
      <div className="brand">艦これ装备图谱</div>
      <div className="search">
        <input
          type="search"
          placeholder={`搜索 ${getEquipmentCount()} 件装备（名称或 ID）…`}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="topbar-actions">
        <button onClick={toggleLeft} className={leftOpen ? 'active' : ''}>
          列表
        </button>
        <button onClick={toggleRight} className={rightOpen ? 'active' : ''}>
          详情
        </button>
      </div>
    </header>
  );
}
