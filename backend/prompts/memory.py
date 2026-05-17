from .. import config


MEMORY_SYSTEM_PROMPT = """You are a story analyst. After reading a chapter, extract ONLY the changes that occurred in this chapter relative to the existing memory.

STRICT RULES:
1. Output MUST be valid JSON matching the MemoryDelta format
2. Do NOT include any text outside the JSON
3. Only output what CHANGED — do not repeat unchanged information
4. For character_updates, only include characters whose state actually changed in this chapter
5. For resolved_plots, only list plots that were explicitly resolved in this chapter
6. All text values in the JSON MUST be written in the same language as the chapter content"""


def build_memory_update_prompt(
    chapter_number: int,
    chapter_title: str,
    chapter_content: str,
    characters: list[str],
    current_memory: dict,
    language: str = "zh",
) -> str:
    char_list = ", ".join(characters)

    none_text = "暂无" if language == "zh" else "None yet"

    current_summary = current_memory.get("story_summary", none_text)
    current_states = current_memory.get("character_states", {})
    current_relationships = current_memory.get("relationships", [])
    current_events = current_memory.get("key_events", [])
    current_plots = current_memory.get("unresolved_plots", [])

    states_text = "\n".join(f"  - {k}: {v}" for k, v in current_states.items()) if current_states else f"  {none_text}"
    rels_text = "\n".join(f"  - {r['character_a']} ↔ {r['character_b']}: {r['relation']}" for r in current_relationships) if current_relationships else f"  {none_text}"
    events_text = "\n".join(f"  - {e}" for e in current_events[-15:]) if current_events else f"  {none_text}"
    plots_text = "\n".join(f"  - {p}" for p in current_plots) if current_plots else f"  {none_text}"

    lang_instruction = "所有 JSON 中的文本字段必须使用中文撰写，绝对不允许使用英文。" if language == "zh" else "All text values in the JSON MUST be written in English."

    if language == "zh":
        example_json = '''{
    "new_events": ["本章发生的关键事件1", "本章发生的关键事件2"],
    "character_updates": {
        "角色名": "本章状态变化后的位置、情绪、能力"
    },
    "new_relationships": [
        {"character_a": "角色1", "character_b": "角色2", "relation": "本章新建立或变化的关系"}
    ],
    "resolved_plots": ["本章中已解决的伏笔（原文匹配 unresolved_plots 中的条目）"],
    "new_plots": ["本章新埋下的伏笔或悬念"],
    "chapter_summary": "本章内容的详细摘要（3-5句话，涵盖主要情节）",
    "story_summary_update": "更新后的整体故事概述（2-3句话，覆盖到本章为止的全部剧情）"
}'''
    else:
        example_json = '''{
    "new_events": ["Key event 1 from this chapter", "Key event 2"],
    "character_updates": {
        "CharacterName": "Updated status: location, emotional state, abilities"
    },
    "new_relationships": [
        {"character_a": "Name1", "character_b": "Name2", "relation": "New or changed relationship"}
    ],
    "resolved_plots": ["Plot thread from unresolved_plots that was resolved in this chapter"],
    "new_plots": ["New foreshadowing or mystery planted in this chapter"],
    "chapter_summary": "Detailed summary of this chapter (3-5 sentences covering main events)",
    "story_summary_update": "Updated overall story summary (2-3 sentences covering all chapters up to now)"
}'''

    return f"""Read the following chapter and extract ONLY the changes relative to the existing memory. Do NOT repeat information that hasn't changed.

LANGUAGE: {lang_instruction}

CHAPTER {chapter_number}: {chapter_title}

CHAPTER CONTENT:
{chapter_content[:3000]}

CHARACTERS: {char_list}

EXISTING MEMORY (for reference — only output what changed):
Story Summary: {current_summary}

Character States:
{states_text}

Relationships:
{rels_text}

Key Events So Far:
{events_text}

Unresolved Plot Threads:
{plots_text}

RULES:
- new_events: Only events that happened in THIS chapter (do not repeat existing events)
- character_updates: Only characters whose state CHANGED in this chapter (omit unchanged characters)
- new_relationships: Only relationships that were NEWLY established or CHANGED (omit unchanged pairs)
- resolved_plots: Match text from unresolved_plots above that got resolved in this chapter
- new_plots: Only NEW foreshadowing/mysteries planted in this chapter
- chapter_summary: Summary of THIS chapter only
- story_summary_update: The full updated story summary covering everything so far

OUTPUT FORMAT (strict JSON):
{example_json}

Extract changes now:"""
