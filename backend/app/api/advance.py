from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
from ..core.database import get_db
from ..core.models import Employee, User, CompanySettings, EmployeeAdvance
from ..core.dependencies import get_current_user
from .schemas import AdvanceCreate
import os, requests

router = APIRouter(prefix="/advance", tags=["Advance"])

TZ_BANGKOK = timezone(timedelta(hours=7))


@router.get("")
def get_advances(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(EmployeeAdvance)
    if current_user.company_id:
        q = q.filter(EmployeeAdvance.company_id == current_user.company_id)
    if status_filter:
        q = q.filter(EmployeeAdvance.status == status_filter)
    advances = q.order_by(EmployeeAdvance.created_at.desc()).all()

    result = []
    for a in advances:
        emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
        result.append({
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": emp.full_name if emp else "-",
            "amount": a.amount,
            "reason": a.reason,
            "status": a.status,
            "month": a.month,
            "year": a.year,
            "created_at": a.created_at,
            "approved_at": a.approved_at,
        })
    return result


@router.post("/request")
def request_advance(data: AdvanceCreate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == data.chat_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    advance = EmployeeAdvance(
        company_id=employee.company_id,
        employee_id=employee.id,
        amount=data.amount,
        reason=data.reason,
        status="pending",
        month=data.month,
        year=data.year
    )
    db.add(advance)
    db.commit()
    db.refresh(advance)

    # Notify owner
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == employee.company_id).first()
    if settings and settings.owner_chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            msg = (
                f"💸 คำขอเงินสำรองจ่าย\n"
                f"พนักงาน: {employee.full_name}\n"
                f"จำนวน: {data.amount:,.0f} บาท\n"
                f"เหตุผล: {data.reason or '-'}"
            )
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": settings.owner_chat_id, "text": msg},
                    timeout=5
                )
            except Exception:
                pass

    return {"status": "success", "id": advance.id}


@router.post("/{advance_id}/approve")
def approve_advance(
    advance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    advance = db.query(EmployeeAdvance).filter(
        EmployeeAdvance.id == advance_id,
        EmployeeAdvance.company_id == current_user.company_id
    ).first()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    advance.status = "approved"
    advance.approved_by = str(current_user.id)
    advance.approved_at = datetime.now(timezone.utc)
    db.commit()

    # Notify employee
    emp = db.query(Employee).filter(Employee.id == advance.employee_id).first()
    if emp and emp.chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": emp.chat_id,
                        "text": f"✅ คำขอเงินสำรองจ่าย {advance.amount:,.0f} บาท ได้รับการอนุมัติแล้ว"
                    },
                    timeout=5
                )
            except Exception:
                pass

    return {"status": "success"}


@router.post("/{advance_id}/reject")
def reject_advance(
    advance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    advance = db.query(EmployeeAdvance).filter(
        EmployeeAdvance.id == advance_id,
        EmployeeAdvance.company_id == current_user.company_id
    ).first()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    advance.status = "rejected"
    advance.approved_at = datetime.now(timezone.utc)
    db.commit()

    emp = db.query(Employee).filter(Employee.id == advance.employee_id).first()
    if emp and emp.chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": emp.chat_id,
                        "text": f"❌ คำขอเงินสำรองจ่าย {advance.amount:,.0f} บาท ถูกปฏิเสธ"
                    },
                    timeout=5
                )
            except Exception:
                pass

    return {"status": "success"}
