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

  const activeChapter = story?.chapters.find((c) => c.id === activeChapterId) || null;

  const handleGenerate = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('创建故事失败');
      const data = await res.json();
      setStory(data);
      if (data.chapters.length > 0) {
        setActiveChapterId(data.chapters[0].id);
      }
      setShowCreateModal(false);
    } catch (err) {
      alert('错误：' + err.message);
    } finally {
      setLoading(false);
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
