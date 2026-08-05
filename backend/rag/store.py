import logging
import os
import re
from typing import Optional

from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
from rag.settings import FAISS_INDEX_PATH

logger = logging.getLogger(__name__)

_SAFE_TENANT_SEGMENT = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")


def _safe_tenant_segment(tenant_id: str) -> str:
    """Prevent FAISS path traversal via crafted tenant_id (e.g. ``a/../b``)."""
    tid = (tenant_id or "").strip().lower()
    if not _SAFE_TENANT_SEGMENT.match(tid):
        raise ValueError(
            "tenant_id must be a lowercase slug (letters, digits, hyphens); "
            "path separators are not allowed"
        )
    return tid


def index_dir(tenant_id: str | None = None) -> str:
    """Per-tenant FAISS directories when tenant_id provided — isolation at storage layer."""
    base = os.path.realpath(FAISS_INDEX_PATH)
    os.makedirs(base, exist_ok=True)
    if tenant_id:
        segment = _safe_tenant_segment(tenant_id)
        path = os.path.realpath(os.path.join(base, segment))
        # Defense in depth: resolved path must stay under FAISS root.
        if path != base and not path.startswith(base + os.sep):
            raise ValueError("tenant_id resolves outside the FAISS index root")
    else:
        path = base
    os.makedirs(path, exist_ok=True)
    return path


def index_exists(tenant_id: str | None = None) -> bool:
    try:
        path = index_dir(tenant_id)
    except ValueError:
        return False
    return os.path.isfile(os.path.join(path, "index.faiss")) and os.path.isfile(
        os.path.join(path, "index.pkl")
    )


def load_store(embeddings: Embeddings, tenant_id: str | None = None) -> Optional[FAISS]:
    if not index_exists(tenant_id):
        return None
    try:
        return FAISS.load_local(
            index_dir(tenant_id),
            embeddings,
            allow_dangerous_deserialization=True,
        )
    except Exception as exc:
        logger.exception("Failed to load FAISS index: %s", exc)
        return None


def save_store(store: FAISS, tenant_id: str | None = None) -> None:
    store.save_local(index_dir(tenant_id))


def get_or_create_store(
    embeddings: Embeddings, documents=None, tenant_id: str | None = None
) -> FAISS:
    existing = load_store(embeddings, tenant_id=tenant_id)
    if existing is not None:
        return existing
    if not documents:
        raise FileNotFoundError(
            "Vector index is empty. POST /api/ingest with documents first."
        )
    store = FAISS.from_documents(documents, embeddings)
    save_store(store, tenant_id=tenant_id)
    return store
