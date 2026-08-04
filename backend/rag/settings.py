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

# LangSmith (optional — Feature 002)
# Set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY via secrets; never commit keys.
