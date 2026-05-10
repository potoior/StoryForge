import { useState, useEffect, useRef } from 'react';

export default function Notepad({ storyId, onClose }) {
  const storageKey = `notes_${storyId}`;
  const [content, setContent] = useState(() => {
    return localStorage.getItem(storageKey) || '';
  });
  const timerRef = useRef(null);

  // Auto-save on content change (1s debounce)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, content);
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, storageKey]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, height: '70vh' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>记事本</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>自动保存中</span>
        </div>
        <textarea
          className="input"
          style={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            resize: 'none',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
          placeholder="在这里记录你的想法、灵感、待办事项..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}
