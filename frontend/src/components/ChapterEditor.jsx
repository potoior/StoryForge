import { useState, useEffect } from 'react';

export default function ChapterEditor({ chapter, onSave }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setSummary(chapter.summary);
      setContent(chapter.content);
    }
  }, [chapter]);

  if (!chapter) {
    return (
      <div className="empty-state">
        <h3>未选择章节</h3>
        <p>从左侧章节列表中选择，或创建一个新故事。</p>
      </div>
    );
  }

  const handleSave = () => {
    onSave(chapter.id, { title, summary, content });
  };

  const hasChanges =
    title !== chapter.title || summary !== chapter.summary || content !== chapter.content;

  return (
    <div className="editor-area">
      <div className="chapter-header">
        <h2>第 {chapter.chapter_number} 章</h2>
      </div>

      <div className="form-group">
        <label>标题</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="chapter-summary">
        <strong>摘要：</strong>
        <input
          className="input"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={{ marginTop: 8, width: '100%' }}
        />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="章节内容..."
      />

      {hasChanges && (
        <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 12 }}>
          保存修改
        </button>
      )}
    </div>
  );
}
