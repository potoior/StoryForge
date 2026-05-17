import { useState, useRef } from 'react';

function countWords(text) {
  if (!text) return 0;
  const chinese = (text.match(/[一-鿿]/g) || []).length;
  const english = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

export default function ChapterList({ chapters, activeId, onSelect, onAddChapter, onDeleteChapter, onReorder }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragNode = useRef(null);

  const handleDelete = (e, chapterId) => {
    e.stopPropagation();
    if (confirm('确定删除此章节？')) {
      onDeleteChapter(chapterId);
    }
  };

  const handleDragStart = (e, idx) => {
    dragIdx !== null || setDragIdx(idx);
    dragNode.current = e.target;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx && onReorder) {
      const ids = chapters.map((c) => c.id);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(idx, 0, moved);
      onReorder(ids);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '';
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="chapter-list">
      {(!chapters || chapters.length === 0) ? (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          暂无章节，请先创建故事。
        </div>
      ) : (
        chapters.map((ch, idx) => (
          <div
            key={ch.id}
            className={`chapter-item ${ch.id === activeId ? 'active' : ''} ${dragIdx === idx ? 'dragging' : ''} ${overIdx === idx && dragIdx !== idx ? 'drag-over' : ''}`}
            onClick={() => onSelect(ch.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <div className="chapter-item-header">
              <div>
                <div className="chapter-number">第 {ch.chapter_number} 章</div>
                <div className="chapter-title">{ch.title}</div>
              </div>
              <button
                className="chapter-delete-btn"
                title="删除章节"
                onClick={(e) => handleDelete(e, ch.id)}
              >
                ×
              </button>
            </div>
            <div className="chapter-item-footer">
              <span className={`chapter-status status-${ch.status}`}>
                {ch.status === 'generated' ? '已生成' : ch.status === 'edited' ? '已编辑' : '已重写'}
              </span>
              <span className="chapter-word-count">{countWords(ch.content)} 字</span>
            </div>
          </div>
        ))
      )}
      {chapters && chapters.length > 0 && (
        <div style={{ padding: 12 }}>
          <button className="btn btn-outline" style={{ width: '100%' }} onClick={onAddChapter}>
            + 添加章节
          </button>
        </div>
      )}
    </div>
  );
}
