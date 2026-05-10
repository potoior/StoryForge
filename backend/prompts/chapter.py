from .. import config


CHAPTER_SYSTEM_PROMPT = f"""You are a creative fiction writer. Your task is to write a single chapter of a story based on the provided outline and context.

STRICT RULES:
1. Output MUST be valid JSON with exactly three fields: "title", "summary", "content"
2. Do NOT include any text outside the JSON
3. The "content" field MUST be at least {config.CHAPTER_MIN_WORDS} words. This is a firm minimum.
4. Write rich, detailed prose with scene descriptions, character emotions, and inner thoughts
5. Include multiple dialogue exchanges between characters
6. Use vivid sensory details (sights, sounds, smells, textures)
7. Stay consistent with previously established characters and events
8. Match the requested writing style
9. Do NOT reference events from future chapters"""


def build_chapter_prompt(
    chapter_number: int,
    chapter_title: str,
    chapter_summary: str,
    characters: list[dict],
    style: str = "default",
    previous_summary: str = "",
    next_summary: str = "",
    language: str = "zh",
) -> str:
    char_descriptions = "\n".join(
        f"- {c['name']}: {c['description']}" + (f" (Personality: {c.get('personality', 'N/A')})" if c.get('personality') else "")
        for c in characters
    )

    style_instructions = {
        "default": "Write in a balanced, engaging narrative style. Focus on character development and vivid scene-building.",
        "power_fantasy": "Write in an exciting 'power fantasy' style (爽文): fast-paced, satisfying victories, show protagonist's growing power. Include dramatic action scenes and awe-inspiring moments.",
        "tragedy": "Write in a tragic romance style (虐恋): emotional depth, bittersweet moments, dramatic tension. Focus on inner conflict and emotional dialogue.",
        "mystery": "Write in a mystery/suspense style: build tension, plant clues, maintain intrigue. Use atmospheric descriptions and subtle foreshadowing.",
    }
    style_text = style_instructions.get(style, style_instructions["default"])

    lang_instruction = "All output (title, summary, content) MUST be written in Chinese (中文)." if language == "zh" else "All output (title, summary, content) MUST be written in English."

    context_parts = []
    if previous_summary:
        context_parts.append(f"STORY MEMORY (accumulated context from all previous chapters):\n{previous_summary}")
    if next_summary:
        context_parts.append(f"NEXT CHAPTER SUMMARY (for continuity):\n{next_summary}")
    context = "\n\n".join(context_parts) if context_parts else "This is the first/only chapter."

    return f"""Write Chapter {chapter_number} of the story. This should be a FULL, detailed chapter — not a summary or outline.

LANGUAGE: {lang_instruction}

CHAPTER TO WRITE:
Title: {chapter_title}
Plot Summary: {chapter_summary}

CHARACTERS:
{char_descriptions}

STORY CONTEXT:
{context}

STYLE:
{style_text}

IMPORTANT: The "content" field must be AT LEAST {config.CHAPTER_MIN_WORDS} words of actual narrative prose. Write a complete, immersive chapter with:
- Detailed scene descriptions and atmosphere
- Character dialogue (multiple exchanges)
- Inner thoughts and emotions
- Sensory details (what characters see, hear, feel)
- Narrative tension and pacing

OUTPUT FORMAT (strict JSON):
{{
    "title": "{chapter_title}",
    "summary": "A brief summary of what actually happens in this chapter (2-3 sentences)",
    "content": "The full chapter text (minimum {config.CHAPTER_MIN_WORDS} words with rich detail and dialogue)"
}}

Write the chapter now:"""
