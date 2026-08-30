"""User administration, notifications and reports."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import ROLES, current_user, require_roles
from lib.db import db
from models.schemas import (
    MessageResponse,
    Notification,
    Report,
    ReportCreate,
    User,
    UserAdminUpdate,
)

router = APIRouter(tags=["admin"])


@router.get("/users", response_model=List[User])
async def list_users(user: dict = Depends(require_roles("admin"))):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return [User(**d) for d in docs]


@router.patch("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str, payload: UserAdminUpdate, user: dict = Depends(require_roles("admin"))
):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "role" in changes and changes["role"] not in ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {list(ROLES)}")
    if "status" in changes:
        if changes["status"] not in ("pending", "active", "suspended"):
            raise HTTPException(status_code=422, detail="status must be pending, active or suspended")
        changes["verified"] = changes["status"] == "active"
    result = await db.users.update_one({"id": user_id}, {"$set": changes})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return User(**doc)


@router.delete("/users/{user_id}", response_model=MessageResponse)
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot remove your own account.")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return MessageResponse(message="User account removed")


@router.get("/notifications", response_model=List[Notification])
async def list_notifications(user: dict = Depends(current_user)):
    docs = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(60)
    return [Notification(**d) for d in docs]


@router.post("/notifications/read-all", response_model=MessageResponse)
async def mark_all_read(user: dict = Depends(current_user)):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return MessageResponse(message="All notifications marked as read")


@router.get("/reports", response_model=List[Report])
async def list_reports(user: dict = Depends(current_user)):
    docs = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Report(**d) for d in docs]


@router.post("/reports", response_model=Report, status_code=201)
async def create_report(
    payload: ReportCreate, user: dict = Depends(require_roles("admin", "gov_officer"))
):
    report = Report(**payload.model_dump(), status="ready", size_kb=180 + len(payload.title) * 7)
    await db.reports.insert_one(report.model_dump())
    await db.notifications.insert_one(
        Notification(kind="report_ready", title="Report ready", body=report.title).model_dump()
    )
    return report
