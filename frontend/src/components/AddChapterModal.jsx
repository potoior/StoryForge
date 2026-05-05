import { useState } from 'react';

export default function AddChapterModal({ chapterNumber, onSubmit, onClose, loading }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, summary });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <h2>添加第 {chapterNumber} 章</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>章节标题</label>
            <input
              className="input"
              placeholder="输入章节标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>章节概要</label>
            <textarea
              className="input"
              placeholder="描述本章主要情节..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '生成中...' : '生成章节'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
