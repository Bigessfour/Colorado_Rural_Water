import os

FAISS_INDEX_PATH = os.environ.get("FAISS_INDEX_PATH", "/data/faiss")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
MEM0_API_KEY = os.environ.get("MEM0_API_KEY", "")
RAG_API_KEY = os.environ.get("RAG_API_KEY", "")
BEDROCK_CHAT_MODEL = os.environ.get("BEDROCK_CHAT_MODEL", "amazon.nova-lite-v1:0")
BEDROCK_EMBED_MODEL = os.environ.get(
    "BEDROCK_EMBED_MODEL", "amazon.titan-embed-text-v2:0"
)
LLM_TIMEOUT_SEC = int(os.environ.get("LLM_TIMEOUT_SEC", "45"))
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge")

# LangSmith (Feature 002) — never commit keys.
LANGCHAIN_API_KEY = (
    os.environ.get("LANGCHAIN_API_KEY") or os.environ.get("LANGSMITH_API_KEY") or ""
)
LANGCHAIN_PROJECT = os.environ.get("LANGCHAIN_PROJECT", "water-saver-assessment-iii")
_LANGCHAIN_TRACING_RAW = (
    os.environ.get("LANGCHAIN_TRACING_V2")
    or os.environ.get("LANGSMITH_TRACING")
    or "false"
)


def langsmith_enabled() -> bool:
    return str(_LANGCHAIN_TRACING_RAW).lower() in {"1", "true", "yes"} and bool(
        LANGCHAIN_API_KEY
    )


def configure_langsmith() -> dict:
    """Enable LangSmith auto-tracing when key + flag are present (Feature 002).

    Docs: https://docs.langchain.com/langsmith/trace-with-langgraph
    """
    enabled = langsmith_enabled()
    if enabled:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGSMITH_TRACING"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
        os.environ["LANGSMITH_API_KEY"] = LANGCHAIN_API_KEY
        os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
        os.environ["LANGSMITH_PROJECT"] = LANGCHAIN_PROJECT
    return {
        "enabled": enabled,
        "project": LANGCHAIN_PROJECT,
        "has_api_key": bool(LANGCHAIN_API_KEY),
        "tracing_flag": str(_LANGCHAIN_TRACING_RAW).lower() in {"1", "true", "yes"},
    }
