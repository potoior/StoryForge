import { useState } from 'react';

const STYLES = [
  { value: 'default', label: '默认' },
  { value: 'power_fantasy', label: '爽文' },
  { value: 'tragedy', label: '虐恋' },
  { value: 'mystery', label: '悬疑' },
];

export default function ControlPanel({
  story,
  activeChapter,
  onGenerate,
  onRewrite,
  onExport,
  onDeleteStory,
  onEditStory,
  loading,
  progress,
  previewMode,
  onTogglePreview,
}) {
  const [style, setStyle] = useState('default');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [showMemory, setShowMemory] = useState(false);

  const handleRewrite = () => {
    if (!activeChapter || !rewriteInstruction.trim()) return;
    onRewrite(activeChapter.id, rewriteInstruction, style);
    setRewriteInstruction('');
  };

  const memory = story?.memory;
  const hasMemory = memory && (
    memory.story_summary ||
    (memory.character_states && Object.keys(memory.character_states).length > 0) ||
    (memory.relationships && memory.relationships.length > 0) ||
    (memory.key_events && memory.key_events.length > 0) ||
    (memory.unresolved_plots && memory.unresolved_plots.length > 0)
  );

  return (
    <div className="right-panel">
      <div className="panel-section">
        <label>写作风格</label>
        <select className="select" value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!story && (
        <div className="panel-section">
          <button
            className="btn btn-primary"
            onClick={() => onGenerate(style)}
            disabled={loading}
          >
            {loading ? '生成中...' : '创建新故事'}
          </button>
        </div>
      )}

      {story && activeChapter && (
        <>
          <div className="panel-section">
            <label>重写指令</label>
            <textarea
              className="input"
              placeholder="描述如何重写本章..."
              value={rewriteInstruction}
              onChange={(e) => setRewriteInstruction(e.target.value)}
            />
            <button
              className="btn btn-accent"
              onClick={handleRewrite}
              disabled={loading || !rewriteInstruction.trim()}
            >
              {loading ? '重写中...' : '重写本章'}
            </button>
            {loading && progress && (
              <div className="progress-text" style={{ marginTop: 8 }}>
                {progress.message}
              </div>
            )}
          </div>

          <div className="panel-section">
            <button
              className="btn btn-outline"
              onClick={onTogglePreview}
              disabled={loading}
            >
              {previewMode ? '返回编辑' : '全文预览'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onExport('markdown')}
              disabled={loading}
            >
              导出 Markdown
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onExport('json')}
              disabled={loading}
            >
              导出 JSON
            </button>
          </div>
        </>
      )}

      {hasMemory && (
        <div className="panel-section">
          <div
            className="memory-toggle"
            onClick={() => setShowMemory(!showMemory)}
          >
            <label style={{ cursor: 'pointer' }}>故事记忆</label>
            <span className="memory-arrow">{showMemory ? '▼' : '▶'}</span>
          </div>

          {showMemory && (
            <div className="memory-panel">
              {memory.story_summary && (
                <div className="memory-block">
                  <div className="memory-label">剧情概述</div>
                  <div className="memory-text">{memory.story_summary}</div>
                </div>
              )}

              {memory.character_states && Object.keys(memory.character_states).length > 0 && (
                <div className="memory-block">
                  <div className="memory-label">角色状态</div>
                  {Object.entries(memory.character_states).map(([name, state]) => (
                    <div key={name} className="memory-entry">
                      <span className="memory-char-name">{name}</span>
                      <span className="memory-char-state">{state}</span>
                    </div>
                  ))}
                </div>
              )}

              {memory.relationships && memory.relationships.length > 0 && (
                <div className="memory-block">
                  <div className="memory-label">人物关系</div>
                  {memory.relationships.map((r, i) => (
                    <div key={i} className="memory-entry">
                      <span className="memory-relation">{r.character_a} ↔ {r.character_b}</span>
                      <span className="memory-char-state">{r.relation}</span>
                    </div>
                  ))}
                </div>
              )}

              {memory.key_events && memory.key_events.length > 0 && (
                <div className="memory-block">
                  <div className="memory-label">关键事件</div>
                  <ul className="memory-list">
                    {memory.key_events.slice(-10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {memory.unresolved_plots && memory.unresolved_plots.length > 0 && (
                <div className="memory-block">
                  <div className="memory-label">未解伏笔</div>
                  <ul className="memory-list unresolved">
                    {memory.unresolved_plots.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {story && (
        <div className="panel-section" style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            <div><strong>{story.title}</strong></div>
            <div>共 {story.chapters.length} 章</div>
            <div>风格：{STYLES.find(s => s.value === story.style)?.label || story.style}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: '0.8rem', padding: '6px 8px' }}
              onClick={onEditStory}
              disabled={loading}
            >
              编辑信息
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1, fontSize: '0.8rem', padding: '6px 8px' }}
              onClick={() => {
                if (confirm('确定删除「' + story.title + '」？此操作不可恢复。')) {
                  onDeleteStory();
                }
              }}
              disabled={loading}
            >
              删除故事
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
