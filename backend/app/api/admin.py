import os
import requests as req_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from ..core.database import get_db
from ..core.dependencies import require_superadmin
from ..core.models import Company, Employee, Checkin, AdLog, Ad

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


@router.get("/global-stats")
def get_global_stats(
    db: Session = Depends(get_db),
    current_user = Depends(require_superadmin)
):
    total_companies = db.query(func.count(Company.id)).scalar()
    total_employees = db.query(func.count(Employee.id)).scalar()
    total_checkins = db.query(func.count(Checkin.id)).scalar()

    total_ad_impressions = db.query(func.count(AdLog.id)).filter(AdLog.action_type == 'impression').scalar()
    total_ad_clicks = db.query(func.count(AdLog.id)).filter(AdLog.action_type == 'click').scalar()

    total_revenue = (total_ad_clicks * 1.5) + (total_ad_impressions * 0.05)

    return {
        "total_companies": total_companies,
        "total_employees": total_employees,
        "total_checkins": total_checkins,
        "total_ad_impressions": total_ad_impressions,
        "total_ad_clicks": total_ad_clicks,
        "total_revenue": total_revenue
    }


@router.get("/companies")
def get_all_companies(
    db: Session = Depends(get_db),
    current_user = Depends(require_superadmin)
):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for company in companies:
        emp_count = db.query(func.count(Employee.id)).filter(
            Employee.company_id == company.id
        ).scalar()
        active_count = db.query(func.count(Employee.id)).filter(
            Employee.company_id == company.id,
            Employee.status == "active"
        ).scalar()
        result.append({
            "id": company.id,
            "name": company.name,
            "join_code": company.join_code,
            "created_at": company.created_at,
            "employee_count": emp_count,
            "active_count": active_count,
        })
    return result


@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user = Depends(require_superadmin)
):
    results = db.query(Employee, Company).join(
        Company, Employee.company_id == Company.id
    ).order_by(Employee.created_at.desc()).all()
    return [
        {
            "id": emp.id,
            "full_name": emp.full_name,
            "chat_id": emp.chat_id,
            "status": emp.status,
            "face_registered": emp.face_registered,
            "company_name": company.name,
            "company_id": company.id,
            "created_at": emp.created_at,
        }
        for emp, company in results
    ]


class BroadcastPayload(BaseModel):
    message: str


@router.post("/broadcast")
def broadcast_message(
    data: BroadcastPayload,
    db: Session = Depends(get_db),
    current_user = Depends(require_superadmin)
):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    employees = db.query(Employee).filter(
        Employee.status == "active",
        Employee.chat_id.isnot(None)
    ).all()

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    sent = 0
    failed = 0

    if bot_token:
        for emp in employees:
            if emp.chat_id:
                try:
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    r = req_lib.post(url, json={"chat_id": emp.chat_id, "text": data.message}, timeout=4)
                    if r.status_code == 200:
                        sent += 1
                    else:
                        failed += 1
                except Exception:
                    failed += 1
    else:
        failed = len(employees)

    return {"sent": sent, "failed": failed, "total": sent + failed}
