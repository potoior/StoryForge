from fastapi import APIRouter, HTTPException
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
