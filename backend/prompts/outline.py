OUTLINE_SYSTEM_PROMPT = """You are a professional story planner and outline creator.
Your task is to generate a structured story outline in JSON format.

STRICT RULES:
1. Output MUST be valid JSON
2. Do NOT include any text outside the JSON
3. Follow the exact schema provided
4. Keep summaries concise (1-2 sentences each)
5. Ensure logical story progression between chapters
6. Maintain character consistency throughout the outline"""


def build_outline_prompt(
    prompt: str,
    characters: list[dict],
    chapter_count: int,
    style: str = "default",
    language: str = "zh",
) -> str:
    char_descriptions = "\n".join(
        f"- {c['name']}: {c['description']}" + (f" (Personality: {c.get('personality', 'N/A')})" if c.get('personality') else "")
        for c in characters
    )

    style_instructions = {
        "default": "Write in a balanced, engaging narrative style.",
        "power_fantasy": "Write in an exciting 'power fantasy' style (爽文): fast-paced, satisfying protagonist victories, escalating power growth.",
        "tragedy": "Write in a tragic romance style (虐恋): emotional depth, bittersweet moments, dramatic tension between characters.",
        "mystery": "Write in a mystery/suspense style: build tension gradually, plant clues, create plot twists.",
    }
    style_text = style_instructions.get(style, style_instructions["default"])

    lang_instruction = "所有输出（标题、章节标题、摘要）必须使用中文撰写，绝对不允许使用英文。禁止出现英文句子或段落。" if language == "zh" else "All output (title, chapter titles, summaries) MUST be in English."

    if language == "zh":
        example_json = '''{
    "title": "故事标题",
    "outline": [
        {
            "title": "第一章标题",
            "summary": "本章简要概述（1-2句话）",
            "key_events": ["事件1", "事件2"]
        }
    ]
}'''
    else:
        example_json = '''{
    "title": "Story Title",
    "outline": [
        {
            "title": "Chapter 1 Title",
            "summary": "Brief 1-2 sentence summary of this chapter",
            "key_events": ["Event 1", "Event 2"]
        }
    ]
}'''

    return f"""Create a story outline with exactly {chapter_count} chapters.

LANGUAGE: {lang_instruction}

STORY CONCEPT:
{prompt}

CHARACTERS:
{char_descriptions}

STYLE GUIDANCE:
{style_text}

OUTPUT FORMAT (strict JSON):
{example_json}

Generate the outline now:"""
