from .. import config


MEMORY_SYSTEM_PROMPT = """You are a story analyst. After reading a chapter, extract structured information to maintain story continuity.

STRICT RULES:
1. Output MUST be valid JSON
2. Do NOT include any text outside the JSON
3. Be concise but precise
4. Track all character states, relationships, and unresolved plot threads
5. All text values in the JSON MUST be written in the same language as the chapter content"""


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
    rels_text = "\n".join(f"  - {r['character_a']} → {r['character_b']}: {r['relation']}" for r in current_relationships) if current_relationships else f"  {none_text}"
    events_text = "\n".join(f"  - {e}" for e in current_events[-10:]) if current_events else f"  {none_text}"
    plots_text = "\n".join(f"  - {p}" for p in current_plots) if current_plots else f"  {none_text}"

    lang_instruction = "所有 JSON 中的文本字段必须使用中文撰写，绝对不允许使用英文。" if language == "zh" else "All text values in the JSON MUST be written in English."

    if language == "zh":
        example_json = '''{
    "story_summary": "更新后的整体故事概述（覆盖目前为止所有章节的2-3句话）",
    "character_states": {
        "角色名": "当前状态：位置、情绪、能力、重要物品"
    },
    "relationships": [
        {"character_a": "角色1", "character_b": "角色2", "relation": "当前关系描述"}
    ],
    "key_events": ["第1章事件", "第2章事件", "... 保留之前所有事件 + 新增"],
    "unresolved_plots": ["尚未解决的悬念或伏笔"]
}'''
    else:
        example_json = '''{
    "story_summary": "Updated overall story summary (2-3 sentences covering all chapters so far)",
    "character_states": {
        "CharacterName": "Current status: location, emotional state, abilities, important possessions"
    },
    "relationships": [
        {"character_a": "Name1", "character_b": "Name2", "relation": "Current relationship description"}
    ],
    "key_events": ["Event from ch1", "Event from ch2", "... keep all previous + add new"],
    "unresolved_plots": ["Unresolved mystery or foreshadowing that hasn't been addressed"]
}'''

    return f"""Read the following chapter and update the story memory.

LANGUAGE: {lang_instruction}

CHAPTER {chapter_number}: {chapter_title}

CHAPTER CONTENT:
{chapter_content[:3000]}

CHARACTERS: {char_list}

CURRENT MEMORY:
Story Summary: {current_summary}

Character States:
{states_text}

Relationships:
{rels_text}

Key Events So Far:
{events_text}

Unresolved Plot Threads:
{plots_text}

Update the memory based on what happens in this new chapter. For relationships, only track pairs that have meaningful interactions.

OUTPUT FORMAT (strict JSON):
{example_json}

Update memory now:"""
