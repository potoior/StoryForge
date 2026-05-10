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

    lang_instruction = "All output (title, chapter titles, summaries) MUST be in Chinese (中文)." if language == "zh" else "All output (title, chapter titles, summaries) MUST be in English."

    return f"""Create a story outline with exactly {chapter_count} chapters.

LANGUAGE: {lang_instruction}

STORY CONCEPT:
{prompt}

CHARACTERS:
{char_descriptions}

STYLE GUIDANCE:
{style_text}

OUTPUT FORMAT (strict JSON):
{{
    "title": "Story Title",
    "outline": [
        {{
            "title": "Chapter 1 Title",
            "summary": "Brief 1-2 sentence summary of this chapter",
            "key_events": ["Event 1", "Event 2"]
        }}
    ]
}}

Generate the outline now:"""
