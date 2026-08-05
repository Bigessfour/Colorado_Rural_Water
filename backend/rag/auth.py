from flask import jsonify, request
from rag.settings import RAG_API_KEY


def require_rag_api_key():
    """Shared key for Compose RAG.

    Empty ``RAG_API_KEY`` = open (local Assessment demos only).
    Non-localhost / shared Compose stacks must set ``RAG_API_KEY`` in ``.env``.
    """
    if not RAG_API_KEY:
        return None
    provided = (
        request.headers.get("x-rag-api-key")
        or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    )
    if provided != RAG_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None
