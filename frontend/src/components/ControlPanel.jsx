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
  loading,
  progress,
}) {
  const [style, setStyle] = useState('default');
  const [rewriteInstruction, setRewriteInstruction] = useState('');

  const handleRewrite = () => {
    if (!activeChapter || !rewriteInstruction.trim()) return;
    onRewrite(activeChapter.id, rewriteInstruction, style);
    setRewriteInstruction('');
  };

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

      {story && (
        <div className="panel-section" style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div><strong>{story.title}</strong></div>
            <div>共 {story.chapters.length} 章</div>
            <div>风格：{STYLES.find(s => s.value === story.style)?.label || story.style}</div>
          </div>
        </div>
      )}
    </div>
  );
}
