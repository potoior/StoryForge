import json
import re
import shutil
from pathlib import Path
from . import config
from .models import Story

OUTPUT_DIR = Path(config.OUTPUT_DIR)


def _sanitize_title(title: str) -> str:
    """将书名转为合法的文件夹名。"""
    name = title.strip()
    # 保留中文、英文、数字、空格、连字符
    name = re.sub(r"[^\w\s一-鿿-]", "", name)
    # 空格替换为连字符
    name = re.sub(r"\s+", "-", name).strip("-")
    return name or "untitled"


def _story_dir(story: Story) -> Path:
    """根据书名生成存储目录。"""
    folder = _sanitize_title(story.title)
    path = OUTPUT_DIR / folder
    # 如果同名文件夹已存在且不属于当前故事，加后缀
    if path.exists():
        meta_path = path / "story.json"
        if meta_path.exists():
            with open(meta_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if existing.get("story_id") != story.story_id:
                path = OUTPUT_DIR / f"{folder}-{story.story_id[:6]}"
    return path


def _find_dir_by_id(story_id: str) -> Path | None:
    """通过 story_id 查找对应目录。"""
    for path in OUTPUT_DIR.iterdir():
        if not path.is_dir():
            continue
        meta = path / "story.json"
        if meta.exists():
            try:
                with open(meta, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("story_id") == story_id:
                    return path
            except Exception:
                continue
    return None


def save_story(story: Story):
    """保存故事到以书名命名的文件夹。"""
    story_dir = _story_dir(story)
    story_dir.mkdir(parents=True, exist_ok=True)
    (story_dir / "chapters").mkdir(exist_ok=True)

    # 保存主文件
    with open(story_dir / "story.json", "w", encoding="utf-8") as f:
        json.dump(story.model_dump(), f, ensure_ascii=False, indent=2)

    # 保存各章节
    for ch in story.chapters:
        ch_path = story_dir / "chapters" / f"chapter_{ch.chapter_number}.json"
        with open(ch_path, "w", encoding="utf-8") as f:
            json.dump(ch.model_dump(), f, ensure_ascii=False, indent=2)


def load_story(story_id: str) -> Story | None:
    """通过 story_id 加载故事。"""
    story_dir = _find_dir_by_id(story_id)
    if not story_dir:
        return None
    meta = story_dir / "story.json"
    with open(meta, "r", encoding="utf-8") as f:
        return Story(**json.load(f))


def load_all_stories() -> list[Story]:
    """加载所有故事。"""
    stories = []
    if not OUTPUT_DIR.exists():
        return stories
    for path in OUTPUT_DIR.iterdir():
        if not path.is_dir():
            continue
        meta = path / "story.json"
        if meta.exists():
            try:
                with open(meta, "r", encoding="utf-8") as f:
                    stories.append(Story(**json.load(f)))
            except Exception:
                continue
    return stories


def delete_story(story_id: str) -> bool:
    """删除故事及其文件夹。"""
    story_dir = _find_dir_by_id(story_id)
    if story_dir and story_dir.exists():
        shutil.rmtree(story_dir)
        return True
    return False


def export_story(story: Story) -> str:
    """导出故事（实际上 save_story 已经做了全部事情，这里返回路径）。"""
    story_dir = _story_dir(story)
    return str(story_dir)
