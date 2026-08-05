import logging
from pathlib import Path
from typing import Iterable, List

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rag.llm import get_embeddings
from rag.settings import KNOWLEDGE_DIR
from rag.store import get_or_create_store, load_store, save_store

# Documented ingest path (LangChain RAG tutorial): load → split → embed → FAISS.


logger = logging.getLogger(__name__)

SPLITTER = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)


def resolve_allowed_ingest_path(path: str | None) -> Path:
    base = Path(KNOWLEDGE_DIR).resolve()
    target = Path(path or KNOWLEDGE_DIR).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError(
            f"Ingest path must be under the knowledge directory ({base})."
        ) from exc
    return target


def load_documents_from_paths(paths: Iterable[str]) -> List[Document]:
    docs: List[Document] = []
    for path in paths:
        p = Path(path)
        if not p.exists():
            continue
        if p.is_dir():
            # Brace globs are not expanded by DirectoryLoader — load each pattern.
            for pattern in ("**/*.md", "**/*.txt"):
                loader = DirectoryLoader(
                    str(p),
                    glob=pattern,
                    loader_cls=TextLoader,
                    loader_kwargs={"encoding": "utf-8"},
                    show_progress=False,
                )
                docs.extend(loader.load())
        else:
            loader = TextLoader(str(p), encoding="utf-8")
            docs.extend(loader.load())
    return docs


def split_documents(documents: List[Document]) -> List[Document]:
    return SPLITTER.split_documents(documents)


def ingest_paths(paths: Iterable[str], tenant_id: str | None = None) -> int:
    raw = load_documents_from_paths(paths)
    if not raw:
        raise ValueError("No documents found at provided paths.")
    for d in raw:
        d.metadata["tenant_id"] = tenant_id or "shared"
    chunks = split_documents(raw)
    embeddings = get_embeddings()
    existing = load_store(embeddings, tenant_id=tenant_id)
    if existing is None:
        get_or_create_store(embeddings, chunks, tenant_id=tenant_id)
    else:
        existing.add_documents(chunks)
        save_store(existing, tenant_id=tenant_id)
    return len(chunks)


def ingest_text_payload(text: str, source: str, tenant_id: str) -> int:
    doc = Document(
        page_content=text, metadata={"source": source, "tenant_id": tenant_id}
    )
    chunks = split_documents([doc])
    embeddings = get_embeddings()
    existing = load_store(embeddings, tenant_id=tenant_id)
    if existing is None:
        get_or_create_store(embeddings, chunks, tenant_id=tenant_id)
    else:
        existing.add_documents(chunks)
        save_store(existing, tenant_id=tenant_id)
    return len(chunks)


def ensure_bootstrap_index(tenant_id: str | None = None) -> int:
    from rag.store import index_exists

    if index_exists(tenant_id):
        return 0
    return ingest_paths([KNOWLEDGE_DIR], tenant_id=tenant_id)
