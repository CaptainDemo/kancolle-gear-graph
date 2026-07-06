import { FilterBar } from './components/FilterBar';
import { EquipmentList } from './components/EquipmentList';
import { EquipmentDetail } from './components/EquipmentDetail';
import { RelationshipGraph } from './components/RelationshipGraph';
import { TopBar } from './components/TopBar';
import { useStore } from './store/useStore';

function App() {
  const leftOpen = useStore((s) => s.leftPanelOpen);
  const rightOpen = useStore((s) => s.rightPanelOpen);
  const selectedId = useStore((s) => s.selectedEquipId);

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        {leftOpen && (
          <aside className="pane pane-left">
            <FilterBar />
            <EquipmentList />
          </aside>
        )}
        <main className="pane pane-center">
          {selectedId != null ? (
            <RelationshipGraph />
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚓</div>
              <div>从左侧列表选择装备，查看其改修与任务关系图谱</div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                单击节点展开 / 双击节点居中
              </div>
            </div>
          )}
        </main>
        {rightOpen && (
          <aside className="pane pane-right">
            {selectedId != null ? <EquipmentDetail /> : (
              <div className="empty-state">未选中装备</div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
