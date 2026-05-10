import { useState, useEffect, useRef, useCallback } from 'react';

export default function ChapterEditor({ chapter, onSave, saveTrigger }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const timerRef = useRef(null);
  const latestRef = useRef({ title: '', summary: '', content: '' });

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setSummary(chapter.summary);
      setContent(chapter.content);
      setSaveStatus('');
    }
  }, [chapter?.id]);

  // 更新最新值 ref
  latestRef.current = { title, summary, content };

  const doSave = useCallback(async () => {
    if (!chapter) return;
    const { title: t, summary: s, content: c } = latestRef.current;
    if (t === chapter.title && s === chapter.summary && c === chapter.content) return;
    setSaveStatus('saving');
    const ok = await onSave(chapter.id, { title: t, summary: s, content: c });
    setSaveStatus(ok ? 'saved' : '');
    if (ok) setTimeout(() => setSaveStatus(''), 2000);
  }, [chapter?.id, onSave]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, 1500);
  }, [doSave]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Ctrl+S: immediate save
  useEffect(() => {
    if (saveTrigger > 0 && chapter) {
      if (timerRef.current) clearTimeout(timerRef.current);
      doSave();
    }
  }, [saveTrigger]);

  // 切换章节时保存上一章
  const prevChapterIdRef = useRef(chapter?.id);
  useEffect(() => {
    if (prevChapterIdRef.current && prevChapterIdRef.current !== chapter?.id) {
      if (timerRef.current) clearTimeout(timerRef.current);
      doSave();
    }
    prevChapterIdRef.current = chapter?.id;
  }, [chapter?.id]);

  if (!chapter) {
    return (
      <div className="empty-state">
        <h3>未选择章节</h3>
        <p>从左侧章节列表中选择，或创建一个新故事。</p>
      </div>
    );
  }

  const wordCount = content.replace(/\s/g, '').length;

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleSave();
  };

  const handleSummaryChange = (e) => {
    setSummary(e.target.value);
    scheduleSave();
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    scheduleSave();
  };

  return (
    <div className="editor-area">
      <div className="chapter-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>第 {chapter.chapter_number} 章</h2>
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : ''}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>标题</label>
        <input
          className="input"
          value={title}
          onChange={handleTitleChange}
        />
      </div>

      <div className="chapter-summary">
        <strong>摘要：</strong>
        <input
          className="input"
          value={summary}
          onChange={handleSummaryChange}
          style={{ marginTop: 8, width: '100%' }}
        />
      </div>

      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="章节内容..."
      />

      <div className="editor-footer">
        <span className="word-count">{wordCount} 字</span>
      </div>
    </div>
  );
}
