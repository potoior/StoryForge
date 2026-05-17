import json
import asyncio
import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models import Story, StoryCreateRequest, ChapterRewriteRequest, ChapterAddRequest, StoryUpdateRequest, WorldUpdateRequest, ChapterReorderRequest
from ..story_engine import StoryEngine
from ..llm_client import create_llm_client
from .. import storage

router = APIRouter(prefix="/api", tags=["stories"])


def _get_engine() -> StoryEngine:
    return StoryEngine(create_llm_client())


@router.post("/stories", response_model=Story)
async def create_story(request: StoryCreateRequest):
    engine = _get_engine()
    story = engine.create_story(request)
    storage.save_story(story)
    return story


@router.post("/stories/stream")
async def create_story_stream(request: StoryCreateRequest):
    """SSE 流式生成故事，实时返回进度和章节内容。"""

    queue = asyncio.Queue()

    def run_engine():
        try:
            engine = _get_engine()
            for event in engine.create_story_streaming(request):
                asyncio.run_coroutine_threadsafe(queue.put(("event", event)), loop)
            asyncio.run_coroutine_threadsafe(queue.put(("done", None)), loop)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(queue.put(("error", str(e))), loop)

    loop = asyncio.get_event_loop()
    thread = threading.Thread(target=run_engine, daemon=True)
    thread.start()

    async def event_generator():
        while True:
            try:
                kind, data = await asyncio.wait_for(queue.get(), timeout=30)
            except asyncio.TimeoutError:
                # 发送心跳保持连接
                yield ": heartbeat\n\n"
                continue

            if kind == "done":
                break
            elif kind == "error":
                yield f"data: {json.dumps({'type': 'error', 'message': data}, ensure_ascii=False)}\n\n"
                break
            elif kind == "event":
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                if data.get("type") == "done":
                    story = Story(**data["story"])
                    storage.save_story(story)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/stories", response_model=list[Story])
async def list_stories():
    return storage.load_all_stories()


@router.get("/stories/{story_id}", response_model=Story)
async def get_story(story_id: str):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.put("/stories/{story_id}", response_model=Story)
async def update_story(story_id: str, request: StoryUpdateRequest):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    if request.title is not None:
        story.title = request.title
    if request.prompt is not None:
        story.prompt = request.prompt
    if request.characters is not None:
        story.characters = request.characters
    if request.style is not None:
        story.style = request.style

    storage.save_story(story)
    return story


@router.put("/stories/{story_id}/world", response_model=Story)
async def update_world(story_id: str, request: WorldUpdateRequest):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    if request.world_lore is not None:
        story.world.world_lore = request.world_lore
    if request.locations is not None:
        story.world.locations = request.locations
    if request.factions is not None:
        story.world.factions = request.factions
    if request.relationships is not None:
        story.world.relationships = request.relationships
    if request.notes is not None:
        story.world.notes = request.notes

    storage.save_story(story)
    return story


@router.put("/stories/{story_id}/chapters/{chapter_id}")
async def edit_chapter(story_id: str, chapter_id: str, body: dict):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    for ch in story.chapters:
        if ch.id == chapter_id:
            if "content" in body:
                ch.content = body["content"]
            if "title" in body:
                ch.title = body["title"]
            if "summary" in body:
                ch.summary = body["summary"]
            ch.status = "edited"
            storage.save_story(story)
            return ch

    raise HTTPException(status_code=404, detail="Chapter not found")


@router.put("/stories/{story_id}/chapters/reorder", response_model=Story)
async def reorder_chapters(story_id: str, request: ChapterReorderRequest):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    chapter_map = {ch.id: ch for ch in story.chapters}
    if set(request.chapter_ids) != set(chapter_map.keys()):
        raise HTTPException(status_code=400, detail="chapter_ids must contain all chapter IDs exactly once")

    story.chapters = [chapter_map[cid] for cid in request.chapter_ids]
    for i, ch in enumerate(story.chapters):
        ch.chapter_number = i + 1

    storage.save_story(story)
    return story


@router.post("/stories/{story_id}/chapters/{chapter_id}/update-memory", response_model=Story)
async def update_chapter_memory(story_id: str, chapter_id: str):
    """Re-extract story memory from a chapter's current content (e.g., after manual edits)."""
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    chapter_idx = None
    for i, ch in enumerate(story.chapters):
        if ch.id == chapter_id:
            chapter_idx = i
            break
    if chapter_idx is None:
        raise HTTPException(status_code=404, detail="Chapter not found")

    engine = _get_engine()
    story = engine.update_memory_for_chapter(story, chapter_idx)
    storage.save_story(story)
    return story


@router.post("/stories/{story_id}/rewrite", response_model=Story)
async def rewrite_chapter(story_id: str, request: ChapterRewriteRequest):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    engine = _get_engine()
    story = engine.rewrite_chapter(story, request)
    storage.save_story(story)
    return story


@router.post("/stories/{story_id}/rewrite/stream")
async def rewrite_chapter_stream(story_id: str, request: ChapterRewriteRequest):
    """SSE 流式重写章节。"""
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    queue = asyncio.Queue()

    def run_engine():
        try:
            engine = _get_engine()
            for event in engine.rewrite_chapter_streaming(story, request):
                asyncio.run_coroutine_threadsafe(queue.put(("event", event)), loop)
            asyncio.run_coroutine_threadsafe(queue.put(("done", None)), loop)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(queue.put(("error", str(e))), loop)

    loop = asyncio.get_event_loop()
    thread = threading.Thread(target=run_engine, daemon=True)
    thread.start()

    async def event_generator():
        while True:
            try:
                kind, data = await asyncio.wait_for(queue.get(), timeout=30)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue

            if kind == "done":
                break
            elif kind == "error":
                yield f"data: {json.dumps({'type': 'error', 'message': data}, ensure_ascii=False)}\n\n"
                break
            elif kind == "event":
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                if data.get("type") == "done":
                    updated_story = Story(**data["story"])
                    storage.save_story(updated_story)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/stories/{story_id}/chapters", response_model=Story)
async def add_chapter(story_id: str, request: ChapterAddRequest):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    engine = _get_engine()
    story = engine.add_chapter(story, request.title, request.summary)
    storage.save_story(story)
    return story


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str):
    if not storage.delete_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Deleted"}


@router.delete("/stories/{story_id}/chapters/{chapter_id}")
async def delete_chapter(story_id: str, chapter_id: str):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    original_len = len(story.chapters)
    story.chapters = [ch for ch in story.chapters if ch.id != chapter_id]
    if len(story.chapters) == original_len:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # 重新编号
    for i, ch in enumerate(story.chapters):
        ch.chapter_number = i + 1

    storage.save_story(story)
    return story


@router.get("/stories/{story_id}/export")
async def export_story(story_id: str):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    path = storage.export_story(story)
    return {"message": "Exported", "path": path}


@router.get("/stories/{story_id}/export/markdown")
async def export_story_markdown(story_id: str):
    story = storage.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    path = storage.export_story_markdown(story)
    return {"message": "Exported", "path": path}
