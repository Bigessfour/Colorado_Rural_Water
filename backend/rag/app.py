"""Flask entry for Water Saver RAG (Compose internal port)."""

import logging
import os
import uuid

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from rag.agent_tools import run_tool_agent
from rag.auth import require_rag_api_key
from rag.chain import RAGError, run_rag
from rag.graph import run_alert_triage_graph
from rag.ingest import ingest_paths, ingest_text_payload, resolve_allowed_ingest_path
from rag.llm import LLMConfigurationError
from rag.memory import history_messages, mem0_search
from rag.tenant import memory_user_id, require_tenant_headers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("water-saver.rag")

app = Flask(__name__)
CORS(app)


@app.before_request
def _request_id():
    g.request_id = request.headers.get("x-request-id") or str(uuid.uuid4())


@app.before_request
def _rag_api_key_gate():
    if request.method == "OPTIONS":
        return None
    path = request.path or ""
    if path in ("/health", "/ready"):
        return None
    denied = require_rag_api_key()
    if denied is not None:
        return denied
    return None


def _error(message: str, status: int):
    body = {"error": message, "request_id": getattr(g, "request_id", None)}
    return jsonify(body), status


@app.get("/health")
def health():
    return jsonify(
        {
            "service": "water-saver-rag",
            "status": "ok",
            "request_id": g.request_id,
        }
    )


@app.get("/ready")
def ready():
    db_ok = False
    db_detail = "skipped"
    url = os.environ.get("DATABASE_URL")
    if url:
        try:
            import psycopg2

            conn = psycopg2.connect(url, connect_timeout=3)
            conn.close()
            db_ok = True
            db_detail = "ok"
        except Exception as exc:
            db_detail = str(exc)
    else:
        db_ok = True
        db_detail = "DATABASE_URL unset"
    ok = db_ok
    return (
        jsonify(
            {
                "status": "ready" if ok else "not_ready",
                "db": {"ok": db_ok, "detail": db_detail},
                "request_id": g.request_id,
            }
        ),
        200 if ok else 503,
    )


@app.post("/api/rag")
def api_rag():
    data = request.get_json(silent=True) or {}
    question = data.get("question") or data.get("message") or ""
    try:
        tenant_id, user_id = require_tenant_headers(request, data)
        session_id = data.get("session_id") or "default"
        mem_uid = memory_user_id(tenant_id, user_id)
        municipality = (
            data.get("municipality")
            or data.get("display_name")
            or data.get("displayName")
            or request.headers.get("X-Municipality")
        )
        operator_name = (
            data.get("operator_name")
            or data.get("operatorName")
            or data.get("first_name")
            or data.get("firstName")
            or request.headers.get("X-Operator-Name")
        )
        operator_email = (
            data.get("operator_email")
            or data.get("operatorEmail")
            or data.get("email")
            or request.headers.get("X-Operator-Email")
        )
        result = run_rag(
            question,
            tenant_id=tenant_id,
            user_id=mem_uid,
            session_id=session_id,
            municipality=municipality if isinstance(municipality, str) else None,
            operator_name=operator_name if isinstance(operator_name, str) else None,
            operator_email=operator_email if isinstance(operator_email, str) else None,
        )
        result["request_id"] = g.request_id
        result["tenant_id"] = tenant_id
        return jsonify(result), 200
    except PermissionError as exc:
        return _error(str(exc), 403)
    except RAGError as exc:
        return _error(str(exc), exc.status)
    except LLMConfigurationError as exc:
        return _error(str(exc), 503)
    except Exception:
        logger.exception("RAG failed")
        return _error("RAG processing failed.", 500)


@app.post("/api/ingest")
def api_ingest():
    try:
        tenant_id, _user_id = require_tenant_headers(
            request, request.get_json(silent=True) or {}
        )
        if request.files:
            # Multipart uploads: save under knowledge/tenant-scoped temp via text ingest of content
            count = 0
            for f in request.files.getlist("file"):
                raw = f.read().decode("utf-8", errors="replace")
                count += ingest_text_payload(
                    raw, source=f.filename or "upload.txt", tenant_id=tenant_id
                )
        else:
            data = request.get_json(silent=True) or {}
            if data.get("text"):
                count = ingest_text_payload(
                    data["text"],
                    source=data.get("source") or "inline.txt",
                    tenant_id=tenant_id,
                )
            else:
                allowed = resolve_allowed_ingest_path(data.get("path"))
                count = ingest_paths([str(allowed)], tenant_id=tenant_id)
        return (
            jsonify(
                {
                    "chunks_indexed": count,
                    "status": "ok",
                    "tenant_id": tenant_id,
                    "request_id": g.request_id,
                }
            ),
            200,
        )
    except PermissionError as exc:
        return _error(str(exc), 403)
    except LLMConfigurationError as exc:
        return _error(str(exc), 503)
    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        logger.exception("Ingest failed")
        return _error(f"Ingest failed: {exc}", 500)


@app.get("/api/history")
def api_history():
    try:
        tenant_id, user_id = require_tenant_headers(request, {})
        session_id = request.args.get("session_id") or "default"
        mem_uid = memory_user_id(tenant_id, user_id)
        messages = history_messages(mem_uid, session_id)
        memories = mem0_search(mem_uid, query=request.args.get("q") or "")
        return (
            jsonify(
                {
                    "messages": messages,
                    "memories": memories,
                    "session_id": session_id,
                    "tenant_id": tenant_id,
                    "request_id": g.request_id,
                }
            ),
            200,
        )
    except PermissionError as exc:
        return _error(str(exc), 403)


@app.post("/api/agent")
def api_agent():
    """Tool-using agent (Feature 002) — tenant-scoped."""
    data = request.get_json(silent=True) or {}
    try:
        tenant_id, user_id = require_tenant_headers(request, data)
        message = (data.get("message") or data.get("question") or "").strip()
        if not message:
            return _error("message is required", 400)
        result = run_tool_agent(message, tenant_id=tenant_id, user_id=user_id)
        result["request_id"] = g.request_id
        return jsonify(result), 200
    except PermissionError as exc:
        return _error(str(exc), 403)
    except RAGError as exc:
        return _error(str(exc), exc.status)
    except LLMConfigurationError as exc:
        return _error(str(exc), 503)
    except Exception:
        logger.exception("Agent failed")
        return _error("Agent failed.", 500)


@app.post("/api/agent/triage")
def api_triage():
    """LangGraph alert triage path (Feature 002)."""
    data = request.get_json(silent=True) or {}
    try:
        tenant_id, user_id = require_tenant_headers(request, data)
        alert_text = (data.get("alert") or data.get("message") or "").strip()
        if not alert_text:
            return _error("alert is required", 400)
        result = run_alert_triage_graph(
            alert_text, tenant_id=tenant_id, user_id=user_id
        )
        result["request_id"] = g.request_id
        return jsonify(result), 200
    except PermissionError as exc:
        return _error(str(exc), 403)
    except Exception:
        logger.exception("Triage failed")
        return _error("Triage failed.", 500)
