"""Auth primitives: pbkdf2 password hashing, JWT session cookies, RBAC dependencies."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, Response

from lib.db import db

SESSION_COOKIE = "ein_session"
REFRESH_COOKIE = "ein_refresh"
_SECRET = os.environ.get("JWT_SECRET", "ein-dev-secret-change-me")
_ALGO = "HS256"
ACCESS_MINUTES = 60 * 8
# The refresh cookie is what keeps an officer signed in "until they log out": the frontend
# silently renews the access cookie against it, and every renewal rolls this window
# forward, so an active session never expires on its own.
REFRESH_DAYS = 30

# Role hierarchy — the four RBAC roles from the spec.
ROLES = ("admin", "gov_officer", "field_officer", "viewer")

# Registration designations map onto the four internal roles.
DESIGNATION_TO_ROLE = {
    "Administrator": "admin",
    "Government Official": "gov_officer",
    "Disaster Management Officer": "gov_officer",
    "Forest Officer": "field_officer",
    "Environmental Officer": "field_officer",
}


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt, digest = stored.split("$")
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return hmac.compare_digest(check, digest)


def _encode(payload: dict, minutes: int) -> str:
    body = {
        **payload,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(body, _SECRET, algorithm=_ALGO)


def issue_session(response: Response, user_id: str, role: str) -> None:
    """Set the httpOnly access + refresh cookies. Tokens never travel in JSON."""
    access = _encode({"sub": user_id, "role": role, "typ": "access"}, ACCESS_MINUTES)
    refresh = _encode({"sub": user_id, "role": role, "typ": "refresh"}, REFRESH_DAYS * 24 * 60)
    common = dict(httponly=True, samesite="lax", secure=False, path="/")
    response.set_cookie(SESSION_COOKIE, access, max_age=ACCESS_MINUTES * 60, **common)
    response.set_cookie(REFRESH_COOKIE, refresh, max_age=REFRESH_DAYS * 86400, **common)


def clear_session(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")


def decode_token(token: str, typ: str = "access") -> Optional[dict]:
    try:
        claims = jwt.decode(token, _SECRET, algorithms=[_ALGO])
    except jwt.PyJWTError:
        return None
    if claims.get("typ") != typ:
        return None
    return claims


def token_is_current(claims: dict, user_doc: dict) -> bool:
    """Server-side revocation check.

    Clearing a cookie only disarms the browser — the signed JWT itself stays valid until it
    expires, so a retained token could still be replayed after sign-out. Every logout bumps
    the user's `tokens_valid_from` watermark; any token issued before it is refused here.
    """
    cutoff = user_doc.get("tokens_valid_from")
    if not cutoff:
        return True
    issued = claims.get("iat")
    if issued is None:
        return False
    return int(issued) >= int(cutoff)


async def revoke_user_tokens(user_id: str) -> None:
    """Invalidate every access AND refresh token already issued to this user."""
    # +1s guards the same-second edge: a token minted in the same second as the logout
    # would otherwise still satisfy `iat >= cutoff`.
    cutoff = int(datetime.now(timezone.utc).timestamp()) + 1
    await db.users.update_one({"id": user_id}, {"$set": {"tokens_valid_from": cutoff}})


async def current_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    claims = decode_token(token) if token else None
    if not claims:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.users.find_one({"id": claims["sub"]}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if doc.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")
    if not token_is_current(claims, doc):
        raise HTTPException(status_code=401, detail="Session has been signed out")
    return doc


def require_roles(*allowed: str):
    """RBAC dependency — 403 ACCESS RESTRICTED for an authenticated user outside the set."""

    async def guard(user: dict = Depends(current_user)) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="You do not have permission to access this resource.")
        return user

    return guard
