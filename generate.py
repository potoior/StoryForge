"""CLI entry point: python generate.py input.json"""
import json
import os
import sys
from backend.models import StoryCreateRequest
from backend.story_engine import StoryEngine
from backend.llm_client import create_llm_client
from backend import config


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate.py <input.json> [--provider mock|openai|claude]")
        sys.exit(1)

    input_path = sys.argv[1]
    provider = None
    if "--provider" in sys.argv:
        idx = sys.argv.index("--provider")
        if idx + 1 < len(sys.argv):
            provider = sys.argv[idx + 1]

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    request = StoryCreateRequest(**data)
    client = create_llm_client(provider)
    engine = StoryEngine(client)

    used_provider = provider or config.LLM_PROVIDER
    print(f"Generating story with [{used_provider}] provider...")
    story = engine.create_story(request)
    print(f"Story '{story.title}' generated with {len(story.chapters)} chapters.")

    output_dir = os.path.join(config.OUTPUT_DIR, story.story_id)
    os.makedirs(os.path.join(output_dir, "chapters"), exist_ok=True)

    with open(os.path.join(output_dir, "story.json"), "w", encoding="utf-8") as f:
        json.dump(story.model_dump(), f, ensure_ascii=False, indent=2)

    for ch in story.chapters:
        path = os.path.join(output_dir, "chapters", f"chapter_{ch.chapter_number}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(ch.model_dump(), f, ensure_ascii=False, indent=2)

    print(f"Output saved to {output_dir}/")


if __name__ == "__main__":
    main()
