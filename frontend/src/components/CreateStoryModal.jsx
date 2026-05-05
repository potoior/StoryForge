import { useState } from 'react';

const STYLES = [
  { value: 'default', label: '默认' },
  { value: 'power_fantasy', label: '爽文' },
  { value: 'tragedy', label: '虐恋' },
  { value: 'mystery', label: '悬疑' },
];

export default function CreateStoryModal({ onSubmit, onClose, loading }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('default');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title,
      prompt,
      characters: characters.filter((c) => c.name.trim()),
      outline: outline.filter((o) => o.title.trim()),
      style,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '创建中...' : '创建故事'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
