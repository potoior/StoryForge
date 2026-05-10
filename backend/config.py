import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# Claude
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

# 第三方兼容供应商（OpenAI 兼容接口）
OPENAI_COMPATIBLE_BASE_URL = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "")
OPENAI_COMPATIBLE_API_KEY = os.getenv("OPENAI_COMPATIBLE_API_KEY", "")
OPENAI_COMPATIBLE_MODEL = os.getenv("OPENAI_COMPATIBLE_MODEL", "")

# LLM 生成参数
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "8192"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "120"))  # 秒

# 内容长度要求
CHAPTER_MIN_WORDS = int(os.getenv("CHAPTER_MIN_WORDS", "1000"))

# 服务
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "output")

PROJECT_ROOT = Path(__file__).parent.parent

# 启动时校验必要配置
def _check_config():
    if LLM_PROVIDER == "openai" and not OPENAI_API_KEY:
        print("[WARNING] LLM_PROVIDER=openai 但 OPENAI_API_KEY 未设置，将回退到 mock")
        return "mock"
    if LLM_PROVIDER == "openai_compatible":
        if not OPENAI_COMPATIBLE_BASE_URL:
            print("[WARNING] LLM_PROVIDER=openai_compatible 但 OPENAI_COMPATIBLE_BASE_URL 未设置，将回退到 mock")
            return "mock"
        if not OPENAI_COMPATIBLE_API_KEY:
            print("[WARNING] LLM_PROVIDER=openai_compatible 但 OPENAI_COMPATIBLE_API_KEY 未设置，将回退到 mock")
            return "mock"
        if not OPENAI_COMPATIBLE_MODEL:
            print("[WARNING] LLM_PROVIDER=openai_compatible 但 OPENAI_COMPATIBLE_MODEL 未设置，将回退到 mock")
            return "mock"
    if LLM_PROVIDER == "claude" and not ANTHROPIC_API_KEY:
        print("[WARNING] LLM_PROVIDER=claude 但 ANTHROPIC_API_KEY 未设置，将回退到 mock")
        return "mock"
    return LLM_PROVIDER

LLM_PROVIDER = _check_config()
