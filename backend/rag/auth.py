from flask import jsonify, request

from rag.settings import RAG_API_KEY


def require_rag_api_key():
    """Optional shared key for Compose demos. Empty RAG_API_KEY = open (local only)."""
    if not RAG_API_KEY:
        return None
    provided = (
        request.headers.get("x-rag-api-key")
        or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    )
    if provided != RAG_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None
