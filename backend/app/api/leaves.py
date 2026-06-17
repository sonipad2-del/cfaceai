from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.models import Employee, LeaveRequest, CompanySettings, User
from ..core.dependencies import get_current_user
from .schemas import LeaveSubmit, LeaveStatusUpdate
import os
import requests

router = APIRouter()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

@router.post("/submit")
def submit_leave(data: LeaveSubmit, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == data.chat_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    leave = LeaveRequest(
        employee_id=employee.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        total_days=data.total_days,
        reason=data.reason,
        attachment_path=data.attachment_path,
        status="pending"
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    if settings and settings.owner_chat_id and TELEGRAM_BOT_TOKEN:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        message_text = f"📢 คำขอลาหยุดใหม่!\nพนักงาน: {employee.full_name}\nประเภท: {leave.leave_type}\nวันที่: {leave.start_date} - {leave.end_date} (รวม {leave.total_days} วัน)\nเหตุผล: {leave.reason}"
        payload = {
            "chat_id": settings.owner_chat_id,
            "text": message_text,
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {"text": "✅ อนุมัติ", "callback_data": f"approve_leave_{leave.id}"},
                        {"text": "❌ ไม่อนุมัติ", "callback_data": f"reject_leave_{leave.id}"}
                    ]
                ]
            }
        }
        try:
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            print(f"Failed to send Telegram message to owner: {e}")

    return {"status": "success", "leave_id": leave.id}

@router.put("/{leave_id}/status")
def update_leave_status(leave_id: str, data: LeaveStatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = data.status
    db.commit()

    return {
        "status": "success",
        "employee_chat_id": leave.employee.chat_id,
        "employee_name": leave.employee.full_name,
        "leave_type": leave.leave_type
    }

@router.get("")
def get_leaves(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "superadmin":
        leaves = db.query(LeaveRequest).join(Employee).all()
    else:
        leaves = db.query(LeaveRequest).join(Employee).filter(Employee.company_id == current_user.company_id).all()
    
    result = []
    for l in leaves:
        result.append({
            "id": l.id,
            "employee_name": l.employee.full_name,
            "leave_type": l.leave_type,
            "start_date": l.start_date,
            "reason": l.reason,
            "status": l.status,
            "attachment_path": l.attachment_path,
            "created_at": l.created_at
        })
    return result
