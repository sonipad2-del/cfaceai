import os
import requests as req_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import List

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..core.models import Announcement, AnnouncementLog, Employee, User
from .schemas import AnnouncementCreate, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User not associated with a company")

    announcements = db.query(Announcement).filter(
        Announcement.company_id == current_user.company_id
    ).order_by(Announcement.created_at.desc()).all()

    result = []
    for ann in announcements:
        sent_count = db.query(func.count(AnnouncementLog.id)).filter(
            AnnouncementLog.announcement_id == ann.id,
            AnnouncementLog.delivered_at.isnot(None)
        ).scalar()
        
        read_count = db.query(func.count(AnnouncementLog.id)).filter(
            AnnouncementLog.announcement_id == ann.id,
            AnnouncementLog.read_at.isnot(None)
        ).scalar()
        
        clicked_count = db.query(func.count(AnnouncementLog.id)).filter(
            AnnouncementLog.announcement_id == ann.id,
            AnnouncementLog.clicked_at.isnot(None)
        ).scalar()

        ann_dict = {
            "id": str(ann.id),
            "company_id": str(ann.company_id),
            "title": ann.title,
            "message": ann.message,
            "image_url": ann.image_url,
            "created_by": str(ann.created_by) if ann.created_by else None,
            "status": ann.status,
            "created_at": ann.created_at,
            "sent_at": ann.sent_at,
            "sent_count": sent_count,
            "read_count": read_count,
            "clicked_count": clicked_count
        }
        result.append(ann_dict)

    return result


@router.post("", response_model=AnnouncementResponse)
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User not associated with a company")
        
    if not data.message.strip() or not data.title.strip():
        raise HTTPException(status_code=400, detail="Title and message cannot be empty")

    now = datetime.now(timezone.utc)
    
    # Create the announcement record
    ann = Announcement(
        company_id=current_user.company_id,
        title=data.title,
        message=data.message,
        image_url=data.image_url,
        created_by=current_user.id,
        status="sending",
        created_at=now,
        sent_at=now
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    # Fetch active employees with chat_ids
    employees = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.status == "active",
        Employee.chat_id.isnot(None)
    ).all()

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    sent = 0

    if bot_token:
        for emp in employees:
            try:
                # Format the message for Telegram
                full_message = f"📣 <b>{data.title}</b>\n\n{data.message}"
                payload = {
                    "chat_id": emp.chat_id, 
                    "parse_mode": "HTML"
                }
                
                # Check if image is provided
                if data.image_url and data.image_url.strip():
                    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
                    payload["photo"] = data.image_url.strip()
                    payload["caption"] = full_message
                else:
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    payload["text"] = full_message

                r = req_lib.post(url, json=payload, timeout=5)
                
                if r.status_code == 200:
                    sent += 1
                    # Log successful delivery
                    log = AnnouncementLog(
                        announcement_id=ann.id,
                        employee_id=emp.id,
                        delivered_at=datetime.now(timezone.utc)
                    )
                    db.add(log)
            except Exception as e:
                print(f"Failed to send announcement to {emp.chat_id}: {e}")

    ann.status = "sent"
    db.commit()

    return {
        "id": str(ann.id),
        "company_id": str(ann.company_id),
        "title": ann.title,
        "message": ann.message,
        "image_url": ann.image_url,
        "created_by": str(ann.created_by),
        "status": ann.status,
        "created_at": ann.created_at,
        "sent_at": ann.sent_at,
        "sent_count": sent,
        "read_count": 0,
        "clicked_count": 0
    }
