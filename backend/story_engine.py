import json
import re
from typing import Optional
from .models import Story, Chapter, ChapterStatus, StoryCreateRequest, ChapterRewriteRequest, StoryMemory
from .llm_client import BaseLLMClient
from .prompts import (
    OUTLINE_SYSTEM_PROMPT, build_outline_prompt,
    CHAPTER_SYSTEM_PROMPT, build_chapter_prompt,
    REWRITE_SYSTEM_PROMPT, build_rewrite_prompt,
    MEMORY_SYSTEM_PROMPT, build_memory_update_prompt,
)


def _extract_json(text: str) -> dict:
    """从 LLM 返回中提取 JSON，兼容 markdown 代码块、前后多余文本等情况。"""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    m = re.search(r"```(?:json)?\s*\n?([\s\S]*?)\n?\s*```", text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        try:
            return json.loads(text[first:last + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"无法从 LLM 返回中提取 JSON。原始返回:\n{text[:500]}")


def _validate_chapter_data(data: dict, chapter_number: int, chapter_title: str) -> dict:
    """校验章节数据，缺失字段用 fallback 值填充。"""
    if not isinstance(data, dict):
        raise ValueError(f"章节 {chapter_number} 返回数据不是 dict: {type(data)}")

    fallback_title = chapter_title or f"Chapter {chapter_number}"
    fallback_summary = f"Summary for chapter {chapter_number}."
    fallback_content = f"Content for chapter {chapter_number} is being generated."

    return {
        "title": data.get("title", fallback_title),
        "summary": data.get("summary", fallback_summary),
        "content": data.get("content", fallback_content),
    }


def _validate_outline_data(data: dict) -> dict:
    """校验大纲数据。"""
    if not isinstance(data, dict):
        return {"title": "Untitled", "outline": []}

    if "outline" not in data or not isinstance(data["outline"], list):
        data["outline"] = []

    if "title" not in data:
        data["title"] = "Untitled"

    return data


def _build_memory_context(memory: StoryMemory) -> str:
    """将记忆对象转为可读的上下文文本。"""
    parts = []

    if memory.story_summary:
        parts.append(f"STORY SO FAR:\n{memory.story_summary}")

    if memory.character_states:
        states = "\n".join(f"  - {name}: {state}" for name, state in memory.character_states.items())
        parts.append(f"CHARACTER STATES:\n{states}")

    if memory.relationships:
        rels = "\n".join(f"  - {r.character_a} ↔ {r.character_b}: {r.relation}" for r in memory.relationships)
        parts.append(f"RELATIONSHIPS:\n{rels}")

    if memory.key_events:
        events = "\n".join(f"  - {e}" for e in memory.key_events[-15:])
        parts.append(f"KEY EVENTS:\n{events}")

    if memory.unresolved_plots:
        plots = "\n".join(f"  - {p}" for p in memory.unresolved_plots)
        parts.append(f"UNRESOLVED PLOTS:\n{plots}")

    return "\n\n".join(parts) if parts else "No story memory yet."


class StoryEngine:
    def __init__(self, llm_client: BaseLLMClient):
        self.llm = llm_client
        print(f"[StoryEngine] Initialized with {type(llm_client).__name__}")

    def create_story(self, request: StoryCreateRequest) -> Story:
        outline_data = self._generate_outline(request)

        story = Story(
            title=request.title or outline_data.get("title", "Untitled"),
            prompt=request.prompt,
            characters=request.characters,
            outline=request.outline,
            style=request.style,
        )

        user_outline = [o.model_dump() for o in request.outline]
        llm_outline = outline_data.get("outline", [])
        outline_items = user_outline if len(user_outline) == len(llm_outline) else (llm_outline if llm_outline else user_outline)

        for i, item in enumerate(outline_items):
            next_summary = outline_items[i + 1]["summary"] if i < len(outline_items) - 1 else ""

            chapter = self._generate_chapter(
                chapter_number=i + 1,
                chapter_title=item["title"],
                chapter_summary=item["summary"],
                characters=[c.model_dump() for c in request.characters],
                style=request.style or "default",
                memory=story.memory,
                next_summary=next_summary,
            )
            story.chapters.append(chapter)
            story.memory = self._update_memory(story, chapter)
            print(f"[StoryEngine] Memory updated after chapter {i + 1}")

        return story

    def create_story_streaming(self, request: StoryCreateRequest):
        """生成故事的流式版本，yield 进度事件。"""
        yield {"type": "status", "message": "正在生成大纲...", "step": "outline"}

        outline_data = self._generate_outline(request)

        story = Story(
            title=request.title or outline_data.get("title", "Untitled"),
            prompt=request.prompt,
            characters=request.characters,
            outline=request.outline,
            style=request.style,
        )

        user_outline = [o.model_dump() for o in request.outline]
        llm_outline = outline_data.get("outline", [])
        outline_items = user_outline if len(user_outline) == len(llm_outline) else (llm_outline if llm_outline else user_outline)

        total = len(outline_items)
        yield {"type": "progress", "current": 0, "total": total, "message": f"大纲完成，共 {total} 章"}

        for i, item in enumerate(outline_items):
            next_summary = outline_items[i + 1]["summary"] if i < len(outline_items) - 1 else ""

            yield {
                "type": "progress",
                "current": i + 1,
                "total": total,
                "message": f"正在生成第 {i + 1}/{total} 章：{item['title']}",
                "chapter_title": item["title"],
            }

            chapter = self._generate_chapter(
                chapter_number=i + 1,
                chapter_title=item["title"],
                chapter_summary=item["summary"],
                characters=[c.model_dump() for c in request.characters],
                style=request.style or "default",
                memory=story.memory,
                next_summary=next_summary,
            )
            story.chapters.append(chapter)

            yield {
                "type": "chapter_done",
                "current": i + 1,
                "total": total,
                "chapter": chapter.model_dump(),
                "message": f"第 {i + 1} 章完成",
            }

            yield {
                "type": "progress",
                "current": i + 1,
                "total": total,
                "message": f"正在更新故事记忆...",
            }
            story.memory = self._update_memory(story, chapter)

        yield {"type": "done", "story": story.model_dump()}

    def rewrite_chapter(self, story: Story, request: ChapterRewriteRequest) -> Story:
        target_idx = None
        for i, ch in enumerate(story.chapters):
            if ch.id == request.chapter_id:
                target_idx = i
                break
        if target_idx is None:
            raise ValueError(f"Chapter {request.chapter_id} not found")

        target = story.chapters[target_idx]
        next_summary = story.chapters[target_idx + 1].summary if target_idx < len(story.chapters) - 1 else ""

        result = self._rewrite_chapter(
            chapter_number=target.chapter_number,
            chapter_title=target.title,
            current_content=target.content,
            instruction=request.instruction,
            characters=[c.model_dump() for c in story.characters],
            style=request.style or story.style or "default",
            memory=story.memory,
            next_summary=next_summary,
        )

        new_chapter = Chapter(
            id=target.id,
            title=result["title"],
            summary=result["summary"],
            content=result["content"],
            status=ChapterStatus.REGENERATED,
            chapter_number=target.chapter_number,
        )
        story.chapters[target_idx] = new_chapter
        story.memory = self._update_memory(story, new_chapter)
        return story

    def add_chapter(self, story: Story, title: str, summary: str) -> Story:
        chapter_number = len(story.chapters) + 1

        chapter = self._generate_chapter(
            chapter_number=chapter_number,
            chapter_title=title,
            chapter_summary=summary,
            characters=[c.model_dump() for c in story.characters],
            style=story.style or "default",
            memory=story.memory,
            next_summary="",
        )
        story.chapters.append(chapter)
        story.memory = self._update_memory(story, chapter)
        return story

    def _update_memory(self, story: Story, chapter: Chapter) -> StoryMemory:
        """用 LLM 从新章节中提取记忆更新。"""
        print(f"[StoryEngine] Extracting memory from chapter {chapter.chapter_number}...")
        characters = [c.name for c in story.characters]
        current_memory = story.memory.model_dump()

        prompt = build_memory_update_prompt(
            chapter_number=chapter.chapter_number,
            chapter_title=chapter.title,
            chapter_content=chapter.content,
            characters=characters,
            current_memory=current_memory,
        )

        try:
            raw = self.llm.generate(prompt, MEMORY_SYSTEM_PROMPT)
            data = _extract_json(raw)
            return StoryMemory(
                story_summary=data.get("story_summary", story.memory.story_summary),
                character_states=data.get("character_states", story.memory.character_states),
                relationships=data.get("relationships", story.memory.relationships),
                key_events=data.get("key_events", story.memory.key_events),
                unresolved_plots=data.get("unresolved_plots", story.memory.unresolved_plots),
            )
        except Exception as e:
            print(f"[StoryEngine] Memory extraction failed: {e}, keeping existing memory")
            return story.memory

    def _generate_outline(self, request: StoryCreateRequest) -> dict:
        prompt = build_outline_prompt(
            prompt=request.prompt,
            characters=[c.model_dump() for c in request.characters],
            chapter_count=len(request.outline),
            style=request.style or "default",
        )
        raw = self.llm.generate(prompt, OUTLINE_SYSTEM_PROMPT)
        print(f"[StoryEngine] Outline LLM response ({len(raw)} chars)")
        return _validate_outline_data(_extract_json(raw))

    def _generate_chapter(
        self,
        chapter_number: int,
        chapter_title: str,
        chapter_summary: str,
        characters: list[dict],
        style: str,
        memory: StoryMemory,
        next_summary: str,
    ) -> Chapter:
        print(f"[StoryEngine] Generating chapter {chapter_number}: {chapter_title}")

        memory_context = _build_memory_context(memory)

        prompt = build_chapter_prompt(
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            chapter_summary=chapter_summary,
            characters=characters,
            style=style,
            previous_summary=memory_context,
            next_summary=next_summary,
        )

        raw = self.llm.generate(prompt, CHAPTER_SYSTEM_PROMPT)
        print(f"[StoryEngine] Chapter {chapter_number} LLM response ({len(raw)} chars)")
        data = _validate_chapter_data(_extract_json(raw), chapter_number, chapter_title)

        return Chapter(
            title=data["title"],
            summary=data["summary"],
            content=data["content"],
            status=ChapterStatus.GENERATED,
            chapter_number=chapter_number,
        )

    def _rewrite_chapter(
        self,
        chapter_number: int,
        chapter_title: str,
        current_content: str,
        instruction: str,
        characters: list[dict],
        style: str,
        memory: StoryMemory,
        next_summary: str,
    ) -> dict:
        print(f"[StoryEngine] Rewriting chapter {chapter_number}: {chapter_title}")

        memory_context = _build_memory_context(memory)

        prompt = build_rewrite_prompt(
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            current_content=current_content,
            instruction=instruction,
            characters=characters,
            style=style,
            previous_summary=memory_context,
            next_summary=next_summary,
        )

        raw = self.llm.generate(prompt, REWRITE_SYSTEM_PROMPT)
        print(f"[StoryEngine] Rewrite LLM response ({len(raw)} chars)")
        return _validate_chapter_data(_extract_json(raw), chapter_number, chapter_title)
