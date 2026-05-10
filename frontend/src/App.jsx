import { useState } from 'react';
import ChapterList from './components/ChapterList';
import ChapterEditor from './components/ChapterEditor';
import ControlPanel from './components/ControlPanel';
import CreateStoryModal from './components/CreateStoryModal';
import AddChapterModal from './components/AddChapterModal';

const API = '/api';

export default function App() {
  const [story, setStory] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, message }

  const activeChapter = story?.chapters.find((c) => c.id === activeChapterId) || null;

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
        buffer = lines.pop(); // 保留不完整的行

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
              // 实时更新故事状态（逐步显示章节）
              setStory((prev) => {
                if (!prev) {
                  // 首章完成，创建故事骨架
                  return {
                    ...formData,
                    story_id: '', // 稍后由 done 事件填充
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
            }
          } catch {}
        }
      }
    } catch (err) {
      alert('错误：' + err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleSaveChapter = async (chapterId, updates) => {
    if (!story) return;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('保存失败');
      const updated = await res.json();
      setStory({
        ...story,
        chapters: story.chapters.map((c) => (c.id === chapterId ? updated : c)),
      });
    } catch (err) {
      alert('错误：' + err.message);
    }
  };

  const handleRewrite = async (chapterId, instruction, style) => {
    if (!story) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, instruction, style }),
      });
      if (!res.ok) throw new Error('重写失败');
      const data = await res.json();
      setStory(data);
    } catch (err) {
      alert('错误：' + err.message);
    } finally {
      setLoading(false);
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
    } catch (err) {
      alert('错误：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!story) return;
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/export`);
      if (!res.ok) throw new Error('导出失败');
      const data = await res.json();
      alert('故事已导出到：' + data.path);
    } catch (err) {
      alert('错误：' + err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI 剧情工作室</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            新建故事
          </button>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-header">章节列表</div>
          <ChapterList
            chapters={story?.chapters || []}
            activeId={activeChapterId}
            onSelect={setActiveChapterId}
            onAddChapter={() => setShowAddChapterModal(true)}
          />
        </aside>

        <ChapterEditor chapter={activeChapter} onSave={handleSaveChapter} />

        <ControlPanel
          story={story}
          activeChapter={activeChapter}
          onGenerate={() => setShowCreateModal(true)}
          onRewrite={handleRewrite}
          onExport={handleExport}
          loading={loading}
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
    </div>
  );
}
