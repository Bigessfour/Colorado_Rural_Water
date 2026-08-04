"""Tenant isolation helpers for RAG / Mem0.

Mem0 and session memory MUST be keyed as tenant_id:userId from server headers
(or trusted gateway). Never trust client-supplied tenant alone when headers exist.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Tuple

# Match backend/src/shared/tenant-admin.ts normalizeTenantId — blocks path traversal.
_TENANT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
_USER_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._@-]{0,127}$")


def normalize_tenant_id(raw: str) -> str:
    """Lowercase slug tenant id; reject ``..``, slashes, and reserved prefixes."""
    tenant_id = (raw or "").strip().lower()
    if not tenant_id:
        raise PermissionError("tenant_id is required")
    if tenant_id.startswith("_"):
        raise PermissionError("tenant_id cannot start with underscore (reserved)")
    if ".." in tenant_id or "/" in tenant_id or "\\" in tenant_id:
        raise PermissionError("tenant_id must not contain path separators")
    if not _TENANT_ID_RE.match(tenant_id):
        raise PermissionError(
            "tenant_id must be 2–63 chars: lowercase letters, digits, hyphens"
        )
    return tenant_id


def normalize_user_id(raw: str) -> str:
    user_id = (raw or "").strip()
    if not user_id:
        raise PermissionError("user_id is required")
    if ".." in user_id or "/" in user_id or "\\" in user_id:
        raise PermissionError("user_id must not contain path separators")
    if ":" in user_id:
        raise PermissionError("user_id must not contain ':'")
    if not _USER_ID_RE.match(user_id):
        raise PermissionError("user_id contains invalid characters")
    return user_id


def memory_user_id(tenant_id: str, user_id: str) -> str:
    """Stable Mem0 / LangChain session principal — never cross-tenant."""
    tid = normalize_tenant_id(tenant_id)
    uid = normalize_user_id(user_id)
    return f"{tid}:{uid}"


def find_cross_tenant_leaks(
    caller_tenant_id: str, text_parts: list[str], other_tenant_ids: list[str]
) -> list[str]:
    violations: list[str] = []
    hay = "\n".join(text_parts).lower()
    for other in other_tenant_ids:
        if not other or other == caller_tenant_id:
            continue
        if other.lower() in hay:
            violations.append(f'Foreign tenant id "{other}" present in agent context')
    return violations


def assert_no_cross_tenant_context(
    caller_tenant_id: str, text_parts: list[str], other_tenant_ids: list[str]
) -> None:
    leaks = find_cross_tenant_leaks(caller_tenant_id, text_parts, other_tenant_ids)
    if leaks:
        raise PermissionError(f"Agent isolation violation: {'; '.join(leaks)}")


def require_tenant_headers(request, data: Dict[str, Any] | None = None) -> Tuple[str, str]:
    """Resolve tenant/user from trusted headers first, then body (Compose demos).

    Production Compose should sit behind auth that sets X-Tenant-Id / X-User-Id.
    """
    data = data or {}
    tenant_raw = (
        request.headers.get("X-Tenant-Id")
        or request.headers.get("x-tenant-id")
        or data.get("tenant_id")
        or ""
    )
    user_raw = (
        request.headers.get("X-User-Id")
        or request.headers.get("x-user-id")
        or data.get("user_id")
        or ""
    )
    return normalize_tenant_id(str(tenant_raw)), normalize_user_id(str(user_raw))
