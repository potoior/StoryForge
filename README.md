# AI Story Studio

AI 驱动的长篇小说生成系统。支持多章节故事生成、人物设定、大纲规划、AI 自动写作。内置「故事记忆」机制，自动追踪人物关系、剧情发展和伏笔，确保长篇故事的连贯性。

## 核心特性

- **逐章生成**：按大纲逐章调用 LLM 生成内容，每章 1000+ 词
- **流式输出**：SSE 实时返回生成进度，章节逐步显示
- **故事记忆**：自动生成并维护角色状态、关系网、关键事件、未解伏笔
- **局部重写**：选择任意章节重写，记忆系统确保上下文连贯
- **动态加章**：已有故事可随时追加新章节
- **自动保存**：编辑器停止输入 1.5 秒后自动保存，无需手动操作
- **全文预览**：连续阅读模式，带章节目录导航
- **按书名存储**：故事保存在以书名命名的文件夹中，持久化不丢失
- **多供应商支持**：OpenAI / Claude / 任意 OpenAI 兼容接口

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+

### 1. 安装依赖

```bash
cd ai-story-studio
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 LLM 配置（不配置则默认使用 Mock AI）：

```ini
LLM_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
OPENAI_COMPATIBLE_API_KEY=sk-...
OPENAI_COMPATIBLE_MODEL=deepseek-chat
```

### 3. 开发模式

```bash
# 终端 1：后端
uvicorn backend.main:app --reload --port 8000

# 终端 2：前端
cd frontend && npm run dev
```

打开 http://localhost:5173

### 4. 生产部署

```bash
# 构建前端
cd frontend && npm run build && cd ..

# 启动（同时提供 API 和前端页面）
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

打开 http://localhost:8000，前端和 API 在同一端口运行。

## 环境变量配置

所有配置项均可在 `.env` 中设置：

```ini
# ========== LLM 供应商 ==========
# openai / claude / openai_compatible / mock
LLM_PROVIDER=openai_compatible

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# 第三方兼容供应商（DeepSeek、Moonshot、通义千问、硅基流动等）
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
OPENAI_COMPATIBLE_API_KEY=sk-...
OPENAI_COMPATIBLE_MODEL=deepseek-chat

# ========== 生成参数 ==========
LLM_MAX_TOKENS=8192          # 最大输出 token 数
LLM_TEMPERATURE=0.7          # 生成温度（0-1）
LLM_TIMEOUT=120              # LLM 请求超时（秒）
CHAPTER_MIN_WORDS=1000       # 每章最少字数

# ========== 服务配置 ==========
HOST=0.0.0.0
PORT=8000
OUTPUT_DIR=output
```

### 第三方供应商对照表

| 供应商 | BASE_URL | MODEL |
|--------|----------|-------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet` |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 立即保存当前章节 |
| `Esc` | 关闭弹窗 / 下拉菜单 |
| `↑` / `↓` | 切换上一章 / 下一章（非编辑状态） |

## CLI 使用

```bash
python generate.py examples/sample_input.json
python generate.py examples/sample_input.json --provider openai
```

输出结构（按书名存储）：

```
output/
  银发法师传奇/
    story.json              # 完整故事 + 记忆数据
    银发法师传奇.md         # Markdown 导出
    chapters/
      chapter_1.json
      chapter_2.json
```

## 故事记忆系统

系统在每章生成后自动提取并维护以下信息：

| 记忆类型 | 说明 | 示例 |
|----------|------|------|
| `story_summary` | 整体剧情概述 | "Lyra 发现自己是古老血脉的传人，与 Kael 踏上旅途..." |
| `character_states` | 角色当前状态 | `{"Lyra": "在森林中，情绪紧张，已学会初级魔法"}` |
| `relationships` | 角色关系 | `{"Lyra ↔ Kael": "从陌生人变为旅伴，逐渐信任"}` |
| `key_events` | 关键事件列表 | ["村庄遇袭", "Lyra 魔法觉醒", "发现第一件神器"] |
| `unresolved_plots` | 未解伏笔 | ["Kael 的剑中封印着什么", "Vex 的真实目的"] |

生成新章节时，完整记忆会作为上下文传入 LLM，确保：
- 角色性格和关系保持一致
- 已埋伏笔不会被遗忘
- 剧情发展有逻辑连贯性

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/stories` | 创建故事（自动生成全部章节） |
| `POST` | `/api/stories/stream` | 流式创建故事（SSE） |
| `GET` | `/api/stories` | 获取所有故事列表 |
| `GET` | `/api/stories/{id}` | 获取单个故事 |
| `PUT` | `/api/stories/{id}` | 更新故事元信息（书名、人物、风格） |
| `PUT` | `/api/stories/{id}/chapters/{cid}` | 编辑章节内容 |
| `POST` | `/api/stories/{id}/chapters` | 为故事添加新章节 |
| `DELETE` | `/api/stories/{id}/chapters/{cid}` | 删除章节 |
| `POST` | `/api/stories/{id}/rewrite` | AI 重写指定章节 |
| `POST` | `/api/stories/{id}/rewrite/stream` | 流式重写章节（SSE） |
| `DELETE` | `/api/stories/{id}` | 删除故事 |
| `GET` | `/api/stories/{id}/export` | 导出故事到文件 |
| `GET` | `/api/stories/{id}/export/markdown` | 导出 Markdown |

启动后访问 http://localhost:8000/docs 查看交互式 API 文档（Swagger UI）。

## 写作风格

| 风格标识 | 说明 |
|----------|------|
| `default` | 均衡叙事，注重角色发展和场景描写 |
| `power_fantasy` | 爽文风格：快节奏、主角实力飙升、爽点密集 |
| `tragedy` | 虐恋风格：情感深刻、苦乐参半、戏剧张力强 |
| `mystery` | 悬疑风格：逐步铺垫、线索埋设、反转出人意料 |

## 项目架构

```
ai-story-studio/
├── .env.example              # 环境变量示例
├── .env                      # 实际配置（不提交到 Git）
├── backend/
│   ├── main.py               # FastAPI 应用入口（含静态文件服务）
│   ├── config.py             # 环境变量加载 + 启动校验
│   ├── models.py             # Pydantic 数据模型（Story/Chapter/Memory）
│   ├── llm_client.py         # LLM 抽象层（OpenAI/Claude/Compatible/Mock）
│   ├── story_engine.py       # 核心引擎（生成/重写/加章/记忆更新/流式输出）
│   ├── storage.py            # 持久化存储（按书名建目录）
│   ├── prompts/              # 结构化 Prompt 模板
│   │   ├── outline.py        # 大纲生成
│   │   ├── chapter.py        # 章节内容生成
│   │   ├── rewrite.py        # 章节重写
│   │   └── memory.py         # 记忆提取与更新
│   └── api/
│       └── routes.py         # REST API + SSE 路由
├── frontend/
│   ├── dist/                 # 构建产物（npm run build 生成）
│   └── src/
│       ├── App.jsx           # 主应用（状态管理 + 快捷键）
│       ├── App.css           # 全局样式
│       └── components/
│           ├── ChapterList.jsx       # 章节列表 + 删除按钮
│           ├── ChapterEditor.jsx     # 章节编辑器 + 自动保存
│           ├── ControlPanel.jsx      # AI 控制面板 + 记忆可视化
│           ├── CreateStoryModal.jsx  # 创建故事弹窗
│           ├── AddChapterModal.jsx   # 添加章节弹窗
│           ├── EditStoryModal.jsx    # 编辑故事信息弹窗
│           ├── StoryPreview.jsx      # 全文预览 + 目录导航
│           └── Toast.jsx             # Toast 通知组件
├── generate.py               # CLI 入口
├── examples/
│   └── sample_input.json     # 示例输入
└── output/                   # 故事输出（按书名分目录）
```

### 核心设计

- **环境配置**：`config.py` 通过 `python-dotenv` 加载 `.env`，集中管理所有配置，缺少必要项时自动回退 mock 并打印警告。
- **LLM 抽象层**：`BaseLLMClient` 接口 + 4 种实现。支持超时保护（`LLM_TIMEOUT`）。
- **结构化 Prompt**：所有 Prompt 强制 JSON 输出，兼容 markdown 代码块。内容长度要求从 `.env` 的 `CHAPTER_MIN_WORDS` 读取。
- **故事记忆**：每章生成后用 LLM 提取记忆更新，下次生成时完整记忆作为上下文传入。
- **流式生成**：创建和重写均支持 SSE 流式输出，前端实时显示进度。
- **持久化**：故事按书名建文件夹存储，重启后自动加载，支持增删改查。
- **自动保存**：编辑器 1.5 秒无操作自动保存，Ctrl+S 立即保存。
- **生产部署**：`npm run build` 后，FastAPI 自动服务前端静态文件，单端口运行。

## License

MIT
