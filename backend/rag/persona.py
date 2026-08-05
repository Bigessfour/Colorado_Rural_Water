"""Operator-facing persona helpers (first name + friendly municipality).

Internal ``tenant_id`` slugs stay for isolation keys; never echo them as
“tenant town-wiley” in assistant copy.
"""

from __future__ import annotations

import re


def friendly_municipality_name(tenant_id: str, display_name: str | None = None) -> str:
    """Prefer profile display name; else Town/City of … from slug."""
    if display_name and display_name.strip():
        return display_name.strip()
    slug = (tenant_id or "").strip().lower().replace("_", "-")
    if not slug:
        return "your water system"
    parts = [p for p in slug.split("-") if p]
    if not parts:
        return "your water system"
    if parts[0] == "town" and len(parts) > 1:
        rest = " ".join(_title_token(p) for p in parts[1:])
        return f"Town of {rest}"
    if parts[0] == "city" and len(parts) > 1:
        rest = " ".join(_title_token(p) for p in parts[1:])
        return f"City of {rest}"
    return " ".join(_title_token(p) for p in parts)


def operator_first_name(
    *,
    email: str | None = None,
    full_name: str | None = None,
) -> str:
    """First name from display name or email local-part (demo.operator → Demo)."""
    if full_name and full_name.strip():
        return full_name.strip().split()[0]
    if email and "@" in email:
        local = email.split("@", 1)[0].strip()
        token = re.split(r"[._+\-]", local)[0] if local else ""
        if token and re.match(r"^[A-Za-z]", token):
            return token[:1].upper() + token[1:].lower()
    return "there"


def _title_token(token: str) -> str:
    if not token:
        return token
    if len(token) <= 3 and token.isalpha():
        # Keep short tokens readable (co → Co) without yelling CO.
        return token[:1].upper() + token[1:].lower()
    return token[:1].upper() + token[1:].lower()
