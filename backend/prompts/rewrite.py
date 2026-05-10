from .. import config


REWRITE_SYSTEM_PROMPT = f"""You are a professional story editor. Your task is to rewrite a specific chapter based on the user's modification instructions.

STRICT RULES:
1. Output MUST be valid JSON with exactly three fields: "title", "summary", "content"
2. Do NOT include any text outside the JSON
3. The "content" field MUST be at least {config.CHAPTER_MIN_WORDS} words. This is a firm minimum.
4. Write rich, detailed prose with scene descriptions, character emotions, and inner thoughts
5. Include multiple dialogue exchanges between characters
6. Maintain consistency with surrounding chapters
7. Follow the user's modification instructions precisely
8. Keep the same characters and their established traits
9. The rewritten chapter should flow naturally from the previous chapter and lead into the next"""


def build_rewrite_prompt(
    chapter_number: int,
    chapter_title: str,
    current_content: str,
    instruction: str,
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
        "power_fantasy": "Write in an exciting 'power fantasy' style (爽文): fast-paced, satisfying victories. Include dramatic action scenes.",
        "tragedy": "Write in a tragic romance style (虐恋): emotional depth, bittersweet moments. Focus on inner conflict and emotional dialogue.",
        "mystery": "Write in a mystery/suspense style: build tension, maintain intrigue. Use atmospheric descriptions.",
    }
    style_text = style_instructions.get(style, style_instructions["default"])

    lang_instruction = "All output (title, summary, content) MUST be written in Chinese (中文)." if language == "zh" else "All output (title, summary, content) MUST be written in English."

    context_parts = []
    if previous_summary:
        context_parts.append(f"STORY MEMORY (accumulated context from all previous chapters):\n{previous_summary}")
    if next_summary:
        context_parts.append(f"NEXT CHAPTER SUMMARY (for continuity):\n{next_summary}")
    context = "\n\n".join(context_parts) if context_parts else "No surrounding chapter context available."

    return f"""Rewrite Chapter {chapter_number} based on the modification instructions. Write a FULL, detailed chapter — not a summary.

LANGUAGE: {lang_instruction}

CURRENT CHAPTER:
Title: {chapter_title}
Content:
{current_content}

MODIFICATION INSTRUCTIONS:
{instruction}

CHARACTERS:
{char_descriptions}

SURROUNDING CHAPTER CONTEXT:
{context}

STYLE:
{style_text}

IMPORTANT: The rewritten "content" must be AT LEAST {config.CHAPTER_MIN_WORDS} words of actual narrative prose. Write a complete, immersive chapter with:
- Detailed scene descriptions and atmosphere
- Character dialogue (multiple exchanges)
- Inner thoughts and emotions
- Sensory details (what characters see, hear, feel)
- Narrative tension and pacing

OUTPUT FORMAT (strict JSON):
{{
    "title": "Updated chapter title (can be changed if instruction requires)",
    "summary": "Updated summary of the rewritten chapter (2-3 sentences)",
    "content": "The full rewritten chapter text (minimum {config.CHAPTER_MIN_WORDS} words with rich detail and dialogue)"
}}

Rewrite the chapter now:"""
