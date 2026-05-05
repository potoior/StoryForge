from .outline import OUTLINE_SYSTEM_PROMPT, build_outline_prompt
from .chapter import CHAPTER_SYSTEM_PROMPT, build_chapter_prompt
from .rewrite import REWRITE_SYSTEM_PROMPT, build_rewrite_prompt
from .memory import MEMORY_SYSTEM_PROMPT, build_memory_update_prompt

__all__ = [
    "OUTLINE_SYSTEM_PROMPT",
    "build_outline_prompt",
    "CHAPTER_SYSTEM_PROMPT",
    "build_chapter_prompt",
    "REWRITE_SYSTEM_PROMPT",
    "build_rewrite_prompt",
    "MEMORY_SYSTEM_PROMPT",
    "build_memory_update_prompt",
]
