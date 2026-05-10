from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
import uuid


class ChapterStatus(str, Enum):
    GENERATED = "generated"
    EDITED = "edited"
    REGENERATED = "regenerated"


class Character(BaseModel):
    name: str
    description: str
    personality: Optional[str] = None
    background: Optional[str] = None


class CharacterRelation(BaseModel):
    """两个角色之间的关系"""
    character_a: str
    character_b: str
    relation: str  # 如：盟友、敌人、恋人、师徒、陌生人→信任


class StoryMemory(BaseModel):
    """故事的累积记忆，随章节推进自动更新"""
    story_summary: str = ""  # 整体剧情概述
    character_states: dict[str, str] = {}  # 角色名 → 当前状态（位置、情绪、能力等）
    relationships: List[CharacterRelation] = []  # 角色关系
    key_events: List[str] = []  # 已发生的关键事件
    unresolved_plots: List[str] = []  # 未解决的伏笔/悬念


class ChapterOutline(BaseModel):
    title: str
    summary: str
    key_events: Optional[List[str]] = None


class Chapter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    summary: str
    content: str
    status: ChapterStatus = ChapterStatus.GENERATED
    chapter_number: int


class Story(BaseModel):
    story_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    prompt: str
    characters: List[Character]
    outline: List[ChapterOutline]
    chapters: List[Chapter] = []
    style: Optional[str] = "default"
    memory: StoryMemory = Field(default_factory=StoryMemory)


class StoryCreateRequest(BaseModel):
    title: str
    prompt: str
    characters: List[Character]
    outline: List[ChapterOutline]
    style: Optional[str] = "default"


class ChapterRewriteRequest(BaseModel):
    chapter_id: str
    instruction: str
    style: Optional[str] = None


class ChapterAddRequest(BaseModel):
    title: str
    summary: str


class StoryUpdateRequest(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    characters: Optional[List[Character]] = None
    style: Optional[str] = None
