import { useState, useCallback, useEffect, useRef } from 'react';
import ChapterList from './components/ChapterList';
import ChapterEditor from './components/ChapterEditor';
import ControlPanel from './components/ControlPanel';
import CreateStoryModal from './components/CreateStoryModal';
import AddChapterModal from './components/AddChapterModal';
import EditStoryModal from './components/EditStoryModal';
import StoryPreview from './components/StoryPreview';
import StoryVisualization from './components/StoryVisualization';
import WorldBuilding from './components/WorldBuilding';
import Notepad from './components/Notepad';
import Toast from './components/Toast';

const API = '/api';

let toastId = 0;

export default function App() {
  const [story, setStory] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [storyList, setStoryList] = useState([]);
  const [showStoryList, setShowStoryList] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [vizMode, setVizMode] = useState(false);
  const [worldMode, setWorldMode] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [showNotepad, setShowNotepad] = useState(false);
  const memoryTimerRef = useRef(null);

  const activeChapter = story?.chapters.find((c) => c.id === activeChapterId) || null;

  // Persist current story ID to localStorage
  useEffect(() => {
    if (story?.story_id) {
      localStorage.setItem('current_story_id', story.story_id);
    } else {
      localStorage.removeItem('current_story_id');
    }
  }, [story?.story_id]);

  // Restore story on mount
  useEffect(() => {
    const savedId = localStorage.getItem('current_story_id');
    if (savedId) {
      loadStory(savedId);
    }
  }, []);
  const hasOpenModal = showCreateModal || showAddChapterModal || showEditModal || showNotepad;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape: close any open modal or mode
      if (e.key === 'Escape') {
        if (showStoryList) setShowStoryList(false);
        else if (showNotepad) setShowNotepad(false);
        else if (previewMode) setPreviewMode(false);
        else if (vizMode) setVizMode(false);
        else if (worldMode) setWorldMode(false);
        return;
      }

      // Don't handle shortcuts when modals are open or user is typing
      if (hasOpenModal) return;
      const tag = e.target.tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+S: save current chapter
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveTrigger((n) => n + 1);
        return;
      }

      // Arrow keys: switch chapters (only when not editing text)
      if (!isEditing && !previewMode && story?.chapters.length > 0) {
        const idx = story.chapters.findIndex((c) => c.id === activeChapterId);
        if (e.key === 'ArrowUp' && idx > 0) {
          e.preventDefault();
          setActiveChapterId(story.chapters[idx - 1].id);
        } else if (e.key === 'ArrowDown' && idx < story.chapters.length - 1) {
          e.preventDefault();
          setActiveChapterId(story.chapters[idx + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, showAddChapterModal, showEditModal, showStoryList, showNotepad, hasOpenModal, previewMode, vizMode, worldMode, story, activeChapterId]);

  const fetchStoryList = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stories`);
      if (res.ok) setStoryList(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchStoryList(); }, [fetchStoryList]);

  const loadStory = async (storyId) => {
    try {
      const res = await fetch(`${API}/stories/${storyId}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      console.log('[loadStory] Loaded:', data.story_id, 'world:', data.world);
      setStory(data);
      setActiveChapterId(data.chapters.length > 0 ? data.chapters[0].id : null);
      setPreviewMode(false);
      setShowStoryList(false);
    } catch (err) {
      addToast('加载故事失败：' + err.message, 'error');
    }
  };

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleGenerate = async (formData) => {
    setLoading(true);
    setProgress({ current: 0, total: 0, message: '正在连接...' });
    try {
      const res = await fetch(`${API}/stories/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('创建故事失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'status' || event.type === 'progress') {
              setProgress({
                current: event.current || 0,
                total: event.total || 0,
                message: event.message,
              });
            } else if (event.type === 'chapter_done') {
              setStory((prev) => {
                if (!prev) {
                  return {
                    ...formData,
                    story_id: '',
                    chapters: [event.chapter],
                    memory: {},
                  };
                }
                const exists = prev.chapters.some((c) => c.id === event.chapter.id);
                return {
                  ...prev,
                  chapters: exists
                    ? prev.chapters.map((c) => (c.id === event.chapter.id ? event.chapter : c))
                    : [...prev.chapters, event.chapter],
                };
              });
            } else if (event.type === 'done') {
              setStory(event.story);
              if (event.story.chapters.length > 0) {
                setActiveChapterId(event.story.chapters[0].id);
              }
              setShowCreateModal(false);
              addToast('故事创建完成！', 'success');
              fetchStoryList();
            } else if (event.type === 'error') {
              addToast('生成失败：' + event.message, 'error');
            }
          } catch {}
        }
      }
    } catch (err) {
      addToast('创建失败：' + err.message, 'error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleSaveChapter = async (chapterId, updates) => {
    if (!story) return false;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('保存失败');
      const updated = await res.json();
      setStory((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters.map((c) => (c.id === chapterId ? updated : c)),
        };
      });

      // Debounced memory re-extraction after manual edit (5s after last save)
      if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);
      memoryTimerRef.current = setTimeout(async () => {
        try {
          const memRes = await fetch(`${API}/stories/${story.story_id}/chapters/${chapterId}/update-memory`, {
            method: 'POST',
          });
          if (memRes.ok) {
            const memData = await memRes.json();
            setStory((prev) => {
              if (!prev) return prev;
              return { ...prev, memory: memData.memory };
            });
          }
        } catch {}
      }, 5000);

      return true;
    } catch (err) {
      addToast('保存失败：' + err.message, 'error');
      return false;
    }
  };

  const handleRewrite = async (chapterId, instruction, style) => {
    if (!story) return;
    setLoading(true);
    setProgress({ current: 0, total: 0, message: '正在重写...' });
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/rewrite/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, instruction, style }),
      });
      if (!res.ok) throw new Error('重写失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'status' || event.type === 'progress') {
              setProgress({ current: 0, total: 0, message: event.message });
            } else if (event.type === 'done') {
              setStory(event.story);
              addToast('章节重写完成！', 'success');
            } else if (event.type === 'error') {
              addToast('重写失败：' + event.message, 'error');
            }
          } catch {}
        }
      }
    } catch (err) {
      addToast('重写失败：' + err.message, 'error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleAddChapter = async ({ title, summary }) => {
    if (!story) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary }),
      });
      if (!res.ok) throw new Error('添加章节失败');
      const data = await res.json();
      setStory(data);
      const newChapter = data.chapters[data.chapters.length - 1];
      setActiveChapterId(newChapter.id);
      setShowAddChapterModal(false);
      addToast('章节添加成功！', 'success');
    } catch (err) {
      addToast('添加失败：' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!story) return;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/chapters/${chapterId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      const data = await res.json();
      setStory(data);
      if (activeChapterId === chapterId) {
        setActiveChapterId(data.chapters.length > 0 ? data.chapters[0].id : null);
      }
      addToast('章节已删除', 'info');
    } catch (err) {
      addToast('删除失败：' + err.message, 'error');
    }
  };

  const handleExport = async (format = 'json') => {
    if (!story) return;
    try {
      const url = format === 'markdown'
        ? `${API}/stories/${story.story_id}/export/markdown`
        : `${API}/stories/${story.story_id}/export`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('导出失败');
      const data = await res.json();
      addToast('已导出到：' + data.path, 'success', 5000);
    } catch (err) {
      addToast('导出失败：' + err.message, 'error');
    }
  };

  const handleDeleteStory = async () => {
    if (!story) return;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setStory(null);
      setActiveChapterId(null);
      setPreviewMode(false);
      addToast('故事已删除', 'info');
      fetchStoryList();
    } catch (err) {
      addToast('删除失败：' + err.message, 'error');
    }
  };

  const handleUpdateStory = async (updates) => {
    if (!story) return;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('更新失败');
      const data = await res.json();
      setStory(data);
      setShowEditModal(false);
      addToast('故事信息已更新', 'success');
      fetchStoryList();
    } catch (err) {
      addToast('更新失败：' + err.message, 'error');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI 剧情工作室</h1>
        <div className="header-actions">
          <div className="story-browser">
            <button
              className="btn btn-outline"
              onClick={() => setShowStoryList(!showStoryList)}
            >
              {story ? story.title : '打开故事'} ▾
            </button>
            {showStoryList && (
              <div className="story-dropdown">
                {storyList.length === 0 ? (
                  <div className="story-dropdown-empty">暂无已保存的故事</div>
                ) : (
                  storyList.map((s) => (
                    <div
                      key={s.story_id}
                      className={`story-dropdown-item ${story?.story_id === s.story_id ? 'active' : ''}`}
                      onClick={() => loadStory(s.story_id)}
                    >
                      <span className="story-dropdown-title">{s.title}</span>
                      <span className="story-dropdown-meta">{s.chapters.length} 章</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            新建故事
          </button>
          {story && (
            <button className="btn btn-outline" onClick={() => setShowNotepad(true)}>
              记事本
            </button>
          )}
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-header">章节列表</div>
          <ChapterList
            chapters={story?.chapters || []}
            activeId={activeChapterId}
            onSelect={(id) => { setActiveChapterId(id); setPreviewMode(false); setVizMode(false); setWorldMode(false); }}
            onAddChapter={() => setShowAddChapterModal(true)}
            onDeleteChapter={handleDeleteChapter}
          />
        </aside>

        {previewMode && story ? (
          <StoryPreview story={story} onClose={() => setPreviewMode(false)} />
        ) : vizMode && story ? (
          <StoryVisualization story={story} />
        ) : worldMode && story ? (
          <WorldBuilding
            story={story}
            onUpdate={(updated) => setStory(updated)}
            addToast={addToast}
          />
        ) : (
          <ChapterEditor chapter={activeChapter} onSave={handleSaveChapter} saveTrigger={saveTrigger} />
        )}

        <ControlPanel
          story={story}
          activeChapter={activeChapter}
          onGenerate={() => setShowCreateModal(true)}
          onRewrite={handleRewrite}
          onExport={handleExport}
          onDeleteStory={handleDeleteStory}
          onEditStory={() => setShowEditModal(true)}
          loading={loading}
          progress={progress}
          previewMode={previewMode}
          onTogglePreview={() => { setPreviewMode(!previewMode); setVizMode(false); setWorldMode(false); }}
          vizMode={vizMode}
          onToggleViz={() => { setVizMode(!vizMode); setPreviewMode(false); setWorldMode(false); }}
          worldMode={worldMode}
          onToggleWorld={() => { setWorldMode(!worldMode); setPreviewMode(false); setVizMode(false); }}
        />
      </div>

      {showCreateModal && (
        <CreateStoryModal
          onSubmit={handleGenerate}
          onClose={() => setShowCreateModal(false)}
          loading={loading}
          progress={progress}
        />
      )}

      {showAddChapterModal && (
        <AddChapterModal
          chapterNumber={(story?.chapters.length || 0) + 1}
          onSubmit={handleAddChapter}
          onClose={() => setShowAddChapterModal(false)}
          loading={loading}
        />
      )}

      {showEditModal && story && (
        <EditStoryModal
          story={story}
          onSubmit={handleUpdateStory}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showNotepad && story && (
        <Notepad
          storyId={story.story_id}
          onClose={() => setShowNotepad(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
