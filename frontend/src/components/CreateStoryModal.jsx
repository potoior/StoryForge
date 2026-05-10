import { useState, useEffect } from 'react';

const STYLES = [
  { value: 'default', label: '默认' },
  { value: 'power_fantasy', label: '爽文' },
  { value: 'tragedy', label: '虐恋' },
  { value: 'mystery', label: '悬疑' },
];

const LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

export default function CreateStoryModal({ onSubmit, onClose, loading, progress }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('default');
  const [language, setLanguage] = useState('zh');
  const [characters, setCharacters] = useState([
    { name: '', description: '', personality: '' },
  ]);
  const [outline, setOutline] = useState([
    { title: '', summary: '' },
  ]);

  const addCharacter = () => {
    setCharacters([...characters, { name: '', description: '', personality: '' }]);
  };

  const removeCharacter = (idx) => {
    setCharacters(characters.filter((_, i) => i !== idx));
  };

  const updateCharacter = (idx, field, value) => {
    const updated = [...characters];
    updated[idx][field] = value;
    setCharacters(updated);
  };

  const addOutlineItem = () => {
    setOutline([...outline, { title: '', summary: '' }]);
  };

  const removeOutlineItem = (idx) => {
    setOutline(outline.filter((_, i) => i !== idx));
  };

  const updateOutlineItem = (idx, field, value) => {
    const updated = [...outline];
    updated[idx][field] = value;
    setOutline(updated);
  };

  const hasContent = title.trim() || prompt.trim() ||
    characters.some((c) => c.name.trim() || c.description.trim()) ||
    outline.some((o) => o.title.trim() || o.summary.trim());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasContent) {
          if (!window.confirm('当前有未保存的内容，确定要关闭吗？')) return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasContent, onClose]);

  const handleOverlayClick = () => {
    if (hasContent) {
      if (!window.confirm('当前有未保存的内容，确定要关闭吗？')) return;
    }
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title,
      prompt,
      characters: characters.filter((c) => c.name.trim()),
      outline: outline.filter((o) => o.title.trim()),
      style,
      language,
    });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>创建新故事</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>书名</label>
            <input
              className="input"
              placeholder="给你的故事取个名字..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>故事主题</label>
            <textarea
              className="input"
              placeholder="描述你的故事构想..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>写作风格</label>
            <select className="select" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>生成语言</label>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>人物设定</label>
            {characters.map((char, idx) => (
              <div key={idx} className="character-card">
                <div className="char-header">
                  <span>人物 {idx + 1}</span>
                  {characters.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      onClick={() => removeCharacter(idx)}
                    >
                      删除
                    </button>
                  )}
                </div>
                <input
                  className="input"
                  placeholder="姓名"
                  value={char.name}
                  onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                  required
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="input"
                  placeholder="描述"
                  value={char.description}
                  onChange={(e) => updateCharacter(idx, 'description', e.target.value)}
                  required
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="input"
                  placeholder="性格（可选）"
                  value={char.personality}
                  onChange={(e) => updateCharacter(idx, 'personality', e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addCharacter}>
              + 添加人物
            </button>
          </div>

          <div className="form-group">
            <label>章节大纲</label>
            {outline.map((item, idx) => (
              <div key={idx} className="outline-item">
                <div className="char-header">
                  <span>第 {idx + 1} 章</span>
                  {outline.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      onClick={() => removeOutlineItem(idx)}
                    >
                      删除
                    </button>
                  )}
                </div>
                <input
                  className="input"
                  placeholder="章节标题"
                  value={item.title}
                  onChange={(e) => updateOutlineItem(idx, 'title', e.target.value)}
                  required
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="input"
                  placeholder="章节概要"
                  value={item.summary}
                  onChange={(e) => updateOutlineItem(idx, 'summary', e.target.value)}
                  required
                />
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addOutlineItem}>
              + 添加章节
            </button>
          </div>

          {loading && progress && (
            <div className="progress-section">
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: progress.total > 0
                      ? `${Math.round((progress.current / progress.total) * 100)}%`
                      : '10%',
                  }}
                />
              </div>
              <div className="progress-text">
                {progress.message}
                {progress.total > 0 && ` (${progress.current}/${progress.total})`}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '生成中...' : '创建故事'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
