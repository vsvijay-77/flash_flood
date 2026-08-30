from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import (
    DESIGNATION_TO_ROLE,
    REFRESH_COOKIE,
    SESSION_COOKIE,
    clear_session,
    current_user,
    decode_token,
    hash_password,
    issue_session,
    revoke_user_tokens,
    token_is_current,
    verify_password,
)
from lib.db import db
from models.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
    RegisterResponse,
    User,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Crude in-memory rate limit for the credential endpoints.
_attempts: dict[str, list[float]] = {}


def _rate_limit(key: str, limit: int = 10, window: float = 60.0) -> None:
    now = datetime.now(timezone.utc).timestamp()
    hits = [t for t in _attempts.get(key, []) if now - t < window]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again shortly.")
    hits.append(now)
    _attempts[key] = hits


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest, request: Request):
    _rate_limit(f"reg:{request.client.host if request.client else 'x'}")
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    role = DESIGNATION_TO_ROLE.get(payload.designation, "viewer")
    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=email,
        phone=payload.phone,
        organization=payload.organization,
        designation=payload.designation,
        role=role,
        state=payload.state,
        district=payload.district,
        status="pending",
        verified=False,
    )
    doc = user.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    return RegisterResponse(
        message="Account Registration Successful",
        requires_verification=True,
        user=user,
    )


@router.post("/login", response_model=User)
async def login(payload: LoginRequest, response: Response, request: Request):
    _rate_limit(f"login:{request.client.host if request.client else 'x'}", limit=15)
    doc = await db.users.find_one({"email": payload.email.lower()})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if doc.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="This account has been suspended.")
    if doc.get("status") == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is awaiting administrator verification.",
        )
    # Drop any revocation watermark left by a previous logout, otherwise the token minted
    # below (iat == now) could fail the `iat >= cutoff` check set moments earlier.
    if doc.get("tokens_valid_from"):
        await db.users.update_one({"id": doc["id"]}, {"$unset": {"tokens_valid_from": ""}})
        doc.pop("tokens_valid_from", None)
    issue_session(response, doc["id"], doc.get("role", "viewer"))
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return User(**doc)


@router.post("/refresh", response_model=MessageResponse)
async def refresh(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE)
    claims = decode_token(token, typ="refresh") if token else None
    if not claims:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    doc = await db.users.find_one({"id": claims["sub"]}, {"_id": 0, "password_hash": 0})
    if not doc or doc.get("status") == "suspended" or not token_is_current(claims, doc):
        clear_session(response)
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    # Re-issue BOTH cookies so the refresh window rolls forward on every renewal — an
    # actively used session therefore never expires on its own.
    issue_session(response, claims["sub"], doc.get("role", "viewer"))
    return MessageResponse(message="Session refreshed")


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response):
    # Revoke server-side too: clearing cookies alone would leave the already-signed JWT
    # replayable until its own expiry.
    token = request.cookies.get(SESSION_COOKIE) or request.cookies.get(REFRESH_COOKIE)
    claims = decode_token(token) if token else None
    if claims is None and token:
        claims = decode_token(token, typ="refresh")
    if claims and claims.get("sub"):
        await revoke_user_tokens(claims["sub"])
    clear_session(response)
    return MessageResponse(message="Signed out")


@router.get("/me", response_model=User)
async def me(user: dict = Depends(current_user)):
    return User(**user)


@router.patch("/me", response_model=User)
async def update_me(payload: ProfileUpdate, user: dict = Depends(current_user)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if changes:
        await db.users.update_one({"id": user["id"]}, {"$set": changes})
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return User(**doc)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(payload: PasswordChange, user: dict = Depends(current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc or not verify_password(payload.current_password, doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    return MessageResponse(message="Password updated successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    _rate_limit(f"forgot:{request.client.host if request.client else 'x'}")
    # Never reveal whether the address exists.
    return MessageResponse(
        message=(
            "If an account exists for "
            f"{payload.email}, password reset instructions have been dispatched to that "
            "official mailbox."
        )
    )
