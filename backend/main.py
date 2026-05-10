from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from .api.routes import router
from . import config

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("AI Story Studio starting...")
    print(f"  LLM_PROVIDER:           {config.LLM_PROVIDER}")
    if config.LLM_PROVIDER == "openai":
        print(f"  OPENAI_MODEL:           {config.OPENAI_MODEL}")
        print(f"  OPENAI_API_KEY:         {'***' + config.OPENAI_API_KEY[-4:] if config.OPENAI_API_KEY else 'NOT SET'}")
    elif config.LLM_PROVIDER == "openai_compatible":
        print(f"  BASE_URL:               {config.OPENAI_COMPATIBLE_BASE_URL or 'NOT SET'}")
        print(f"  MODEL:                  {config.OPENAI_COMPATIBLE_MODEL or 'NOT SET'}")
        print(f"  API_KEY:                {'***' + config.OPENAI_COMPATIBLE_API_KEY[-4:] if config.OPENAI_COMPATIBLE_API_KEY else 'NOT SET'}")
    elif config.LLM_PROVIDER == "claude":
        print(f"  ANTHROPIC_MODEL:        {config.ANTHROPIC_MODEL}")
        print(f"  ANTHROPIC_API_KEY:      {'***' + config.ANTHROPIC_API_KEY[-4:] if config.ANTHROPIC_API_KEY else 'NOT SET'}")
    print(f"  OUTPUT_DIR:             {config.OUTPUT_DIR}")
    print(f"  LLM_MAX_TOKENS:         {config.LLM_MAX_TOKENS}")
    print(f"  LLM_TEMPERATURE:        {config.LLM_TEMPERATURE}")
    print(f"  CHAPTER_MIN_WORDS:      {config.CHAPTER_MIN_WORDS}")
    print("=" * 50)
    yield


app = FastAPI(
    title="AI Story Studio",
    description="AI-powered story generation system",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "message": "AI Story Studio API",
        "docs": "/docs",
        "llm_provider": config.LLM_PROVIDER,
    }


# Serve built frontend (production mode)
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
