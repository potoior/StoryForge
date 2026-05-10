import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models import Story, StoryCreateRequest, ChapterRewriteRequest, ChapterAddRequest
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

    def event_generator():
        engine = _get_engine()
        for event in engine.create_story_streaming(request):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            # 生成完成时保存故事
            if event["type"] == "done":
                story = Story(**event["story"])
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

    def event_generator():
        engine = _get_engine()
        for event in engine.rewrite_chapter_streaming(story, request):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] == "done":
                updated_story = Story(**event["story"])
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
