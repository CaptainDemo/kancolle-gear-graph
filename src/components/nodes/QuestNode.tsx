import { Handle, Position, type NodeProps } from '@xyflow/react';

import { getQuest } from '../../data/loader';
import { QUEST_CATEGORIES } from '../../lib/constants';
import type { QuestNodeData } from '../../data/graph';

export function QuestNode({ data }: NodeProps) {
  if (data.kind !== 'quest') return null;
  const d = data as QuestNodeData;
  const qid = d.questId;
  const q = getQuest(qid);

  return (
    <div className="quest-node" title="任务节点">
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} id="t-top" />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="t-bot" />
      <div className="qid">
        {q?.wikiId ?? `#${qid}`}{' '}
        {q && (
          <span style={{ color: 'var(--text-dim)' }}>
            [{QUEST_CATEGORIES[q.category] ?? q.category}]
          </span>
        )}
      </div>
      <div className="qname">{d.label}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="s-top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="s-bot" />
    </div>
  );
}
