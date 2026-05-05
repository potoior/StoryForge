import json
import re
from abc import ABC, abstractmethod
from typing import Optional
from . import config


class BaseLLMClient(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        pass


class OpenAIClient(BaseLLMClient):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key or config.OPENAI_API_KEY)
        self.model = model or config.OPENAI_MODEL

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content


class OpenAICompatibleClient(BaseLLMClient):
    """适用于任何 OpenAI 兼容接口的第三方供应商。
    例如：DeepSeek、Moonshot、通义千问、硅基流动、Groq、Together 等。"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        from openai import OpenAI
        self.client = OpenAI(
            base_url=base_url or config.OPENAI_COMPATIBLE_BASE_URL,
            api_key=api_key or config.OPENAI_COMPATIBLE_API_KEY,
        )
        self.model = model or config.OPENAI_COMPATIBLE_MODEL

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
        )
        return response.choices[0].message.content


class ClaudeClient(BaseLLMClient):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key or config.ANTHROPIC_API_KEY)
        self.model = model or config.ANTHROPIC_MODEL

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        kwargs = {
            "model": self.model,
            "max_tokens": config.LLM_MAX_TOKENS,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = self.client.messages.create(**kwargs)
        return response.content[0].text


class MockLLMClient(BaseLLMClient):
    """Mock client for testing without API keys."""

    def _extract(self, prompt: str, pattern: str, default: str = "") -> str:
        m = re.search(pattern, prompt, re.IGNORECASE | re.DOTALL)
        return m.group(1).strip() if m else default

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        combined = (system_prompt + " " + prompt).lower()
        print(f"[MockLLM] Generating... (prompt length={len(prompt)})")

        # 大纲生成
        if "story outline" in combined or "create a story outline" in combined:
            # 从用户 prompt 中提取章节信息
            titles = re.findall(r'"title":\s*"([^"]+)"', prompt)
            summaries = re.findall(r'"summary":\s*"([^"]+)"', prompt)
            outline = []
            for i, t in enumerate(titles):
                s = summaries[i] if i < len(summaries) else f"Summary for chapter {i+1}."
                outline.append({"title": t, "summary": s, "key_events": [f"Event in {t}"]})
            if not outline:
                outline = [
                    {"title": "The Beginning", "summary": "Our hero discovers a mysterious map.", "key_events": ["Finds map"]},
                    {"title": "The Journey", "summary": "The hero ventures into the unknown forest.", "key_events": ["Enters forest"]},
                    {"title": "The Revelation", "summary": "The truth behind the map is revealed.", "key_events": ["Reaches destination"]},
                ]
            title_match = re.search(r'STORY CONCEPT:\s*(.+?)(?:\n|CHARACTERS)', prompt, re.DOTALL)
            story_title = title_match.group(1).strip()[:50] if title_match else "The Enchanted Journey"
            print(f"[MockLLM] -> Outline: {len(outline)} chapters")
            return json.dumps({"title": story_title, "outline": outline})

        # 章节重写
        if "rewrite" in combined and "modification" in combined:
            ch_title = self._extract(prompt, r'Title:\s*(.+?)(?:\n|$)')
            instruction = self._extract(prompt, r'MODIFICATION INSTRUCTIONS:\s*(.+?)(?:\n|CHARACTERS|$)')
            print(f"[MockLLM] -> Rewrite: {ch_title}")
            return json.dumps({
                "title": ch_title or "Rewritten Chapter",
                "summary": f"Rewritten based on: {instruction[:80]}" if instruction else "A revised version of the chapter.",
                "content": f"This chapter has been rewritten following the instruction: '{instruction}'.\n\n"
                    f"The story takes a new direction. Characters face unexpected challenges that reshape their understanding of the world. "
                    f"Through dialogue and action, the narrative explores deeper themes while maintaining consistency with the surrounding chapters.\n\n"
                    f"The chapter concludes with a pivotal moment that sets the stage for what comes next."
            })

        # 章节生成
        ch_title = self._extract(prompt, r'Title:\s*(.+?)(?:\n|$)')
        ch_summary = self._extract(prompt, r'Plot Summary:\s*(.+?)(?:\n|CHARACTERS|$)')
        chars = re.findall(r'- (\w+):', prompt)
        char_names = ", ".join(chars[:3]) if chars else "the protagonist"

        print(f"[MockLLM] -> Chapter: {ch_title}")
        c0 = chars[0] if chars else "The hero"
        c0p = chars[0] if chars else "they"
        if len(chars) > 1:
            dialogue = f'"{chars[1]} said, grabbing {chars[0]}\'s arm. "Something isn\'t right."'
        else:
            dialogue = "Every step felt like a decision that could not be undone."
        return json.dumps({
            "title": ch_title or "Chapter Title",
            "summary": ch_summary or "A brief summary of what happens in this chapter.",
            "content": (
                f"The story continues with {char_names} facing new challenges.\n\n"
                f"{c0} looked out across the landscape, heart pounding with a mixture of fear and excitement. "
                f"'This is it,' {c0p} whispered, gripping the worn leather of the travel bag. "
                f"The journey ahead would test everything they knew about themselves.\n\n"
                f"As the group moved forward, the path narrowed between ancient stone walls covered in moss. "
                f"{'A voice called out from the shadows.' if len(chars) > 1 else 'The silence was deafening.'} "
                f"{dialogue}\n\n"
                f"By the time the sun began to set, they had covered more ground than expected. "
                f"The events of the day weighed heavily on everyone, but there was no turning back now."
            )
        })


def create_llm_client(provider: Optional[str] = None, **kwargs) -> BaseLLMClient:
    provider = provider or config.LLM_PROVIDER
    clients = {
        "openai": OpenAIClient,
        "openai_compatible": OpenAICompatibleClient,
        "claude": ClaudeClient,
        "mock": MockLLMClient,
    }
    if provider not in clients:
        raise ValueError(f"Unknown provider: {provider}. Choose from: {list(clients.keys())}")
    return clients[provider](**kwargs)
