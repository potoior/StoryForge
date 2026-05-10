export default function ChapterList({ chapters, activeId, onSelect, onAddChapter, onDeleteChapter }) {
  const handleDelete = (e, chapterId) => {
    e.stopPropagation();
    if (confirm('确定删除此章节？')) {
      onDeleteChapter(chapterId);
    }
  };

  return (
    <div className="chapter-list">
      {(!chapters || chapters.length === 0) ? (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          暂无章节，请先创建故事。
        </div>
      ) : (
        chapters.map((ch) => (
          <div
            key={ch.id}
            className={`chapter-item ${ch.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(ch.id)}
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
            <span className={`chapter-status status-${ch.status}`}>
              {ch.status === 'generated' ? '已生成' : ch.status === 'edited' ? '已编辑' : '已重写'}
            </span>
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
