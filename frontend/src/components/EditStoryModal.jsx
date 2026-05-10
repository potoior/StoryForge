import { useState } from 'react';

const STYLES = [
  { value: 'default', label: '默认' },
  { value: 'power_fantasy', label: '爽文' },
  { value: 'tragedy', label: '虐恋' },
  { value: 'mystery', label: '悬疑' },
];

export default function EditStoryModal({ story, onSubmit, onClose }) {
  const [title, setTitle] = useState(story.title);
  const [prompt, setPrompt] = useState(story.prompt);
  const [style, setStyle] = useState(story.style || 'default');
  const [characters, setCharacters] = useState(
    story.characters.map((c) => ({ ...c }))
  );

  const updateCharacter = (idx, field, value) => {
    const updated = [...characters];
    updated[idx][field] = value;
    setCharacters(updated);
  };

  const addCharacter = () => {
    setCharacters([...characters, { name: '', description: '', personality: '' }]);
  };

  const removeCharacter = (idx) => {
    setCharacters(characters.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title,
      prompt,
      style,
      characters: characters.filter((c) => c.name.trim()),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>编辑故事信息</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>书名</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>故事主题</label>
            <textarea
              className="input"
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
                  value={char.personality || ''}
                  onChange={(e) => updateCharacter(idx, 'personality', e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addCharacter}>
              + 添加人物
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
