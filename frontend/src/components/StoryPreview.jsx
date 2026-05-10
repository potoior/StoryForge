import { useRef } from 'react';

export default function StoryPreview({ story, onClose }) {
  const contentRef = useRef(null);

  const totalWords = story.chapters.reduce(
    (sum, ch) => sum + (ch.content?.replace(/\s/g, '').length || 0),
    0
  );

  const scrollToChapter = (chapterNumber) => {
    const el = contentRef.current?.querySelector(`#preview-ch-${chapterNumber}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="preview-container">
      <nav className="preview-toc">
        <div className="preview-toc-header">目录</div>
        {story.chapters.map((ch) => (
          <div
            key={ch.id}
            className="preview-toc-item"
            onClick={() => scrollToChapter(ch.chapter_number)}
          >
            <span className="preview-toc-num">{ch.chapter_number}</span>
            <span className="preview-toc-title">{ch.title}</span>
          </div>
        ))}
      </nav>

      <div className="preview-area" ref={contentRef}>
        <div className="preview-header">
          <div>
            <h2>{story.title}</h2>
            <span className="preview-stats">
              {story.chapters.length} 章 · {totalWords.toLocaleString()} 字
            </span>
          </div>
          <button className="btn btn-outline" onClick={onClose}>
            返回编辑
          </button>
        </div>

        {story.characters && story.characters.length > 0 && (
          <div className="preview-characters">
            <h3>人物</h3>
            <div className="preview-char-list">
              {story.characters.map((c, i) => (
                <span key={i} className="preview-char-tag">
                  <strong>{c.name}</strong>：{c.description}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="preview-chapters">
          {story.chapters.map((ch) => (
            <article key={ch.id} id={`preview-ch-${ch.chapter_number}`} className="preview-chapter">
              <h3>第 {ch.chapter_number} 章：{ch.title}</h3>
              {ch.summary && <p className="preview-chapter-summary">{ch.summary}</p>}
              <div className="preview-chapter-content">
                {ch.content.split('\n').map((para, i) => (
                  para.trim() ? <p key={i}>{para}</p> : null
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
