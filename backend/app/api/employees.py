from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..core.models import Company, Employee, User, CompanySettings, Checkin, LeaveRequest
from ..core.dependencies import get_current_user
from .schemas import EmployeeRegister, EmployeeResponse, EmployeeUpdate, EmployeeSelfRegister, EmployeeApprove
from datetime import datetime, timezone, timedelta, time
import requests
import os
import uuid
import cv2
import numpy as np

router = APIRouter(prefix="/employees", tags=["Employees"])

TZ_BANGKOK = timezone(timedelta(hours=7))


def _calc_monthly(emp, db, month_start):
    checkins = db.query(Checkin).filter(
        Checkin.employee_id == emp.id,
        Checkin.check_in_time >= month_start,
        Checkin.check_out_time.isnot(None)
    ).all()
    total_hours = sum(
        max(0, (c.check_out_time - c.check_in_time).total_seconds() / 3600.0)
        for c in checkins if c.check_out_time and c.check_in_time
    )
    monthly_salary = round(total_hours * (emp.base_rate or 0.0), 2)
    return round(total_hours, 2), monthly_salary


# 1. List employees for the admin's company
@router.get("")
def get_employees(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.company_id and current_user.role != "superadmin":
        raise HTTPException(status_code=404, detail="User is not associated with a company")

    q = db.query(Employee)
    if current_user.company_id:
        q = q.filter(Employee.company_id == current_user.company_id)
    if status_filter:
        q = q.filter(Employee.status == status_filter)

    employees = q.all()
    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = []
    for emp in employees:
        total_hours, monthly_salary = _calc_monthly(emp, db, month_start)
        result.append({
            "id": emp.id,
            "company_id": emp.company_id,
            "chat_id": emp.chat_id,
            "full_name": emp.full_name,
            "status": emp.status,
            "face_registered": emp.face_registered,
            "face_photo_path": emp.face_photo_path,
            "base_rate": emp.base_rate or 0.0,
            "employment_type": emp.employment_type or "monthly",
            "created_at": emp.created_at,
            "monthly_hours": total_hours,
            "monthly_salary": monthly_salary,
            "phone": emp.phone,
            "email": emp.email,
            "position": emp.position,
            "department": emp.department,
            "start_date": emp.start_date,
            "bank_account": emp.bank_account,
            "bank_name": emp.bank_name,
            "id_card": emp.id_card,
            "day_off": emp.day_off,
        })
    return result


# 2. Self-register (public endpoint — no auth required)
@router.post("/self-register")
def self_register_employee(data: EmployeeSelfRegister, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.join_code == data.join_code).first()
    if not company:
        raise HTTPException(status_code=404, detail="รหัสเข้าร่วมไม่ถูกต้อง")

    new_employee = Employee(
        company_id=company.id,
        chat_id=None,
        full_name=data.full_name,
        status="pending",
        phone=data.phone,
        email=data.email,
        position=data.position,
        department=data.department,
        terms_accepted=True,
        terms_version="v1.0",
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    # Notify owner if linked
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if settings and settings.owner_chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            msg = (
                f"🔔 พนักงานใหม่รอการอนุมัติ\n"
                f"ชื่อ: {new_employee.full_name}\n"
                f"ตำแหน่ง: {data.position or '-'}\n"
                f"เบอร์: {data.phone or '-'}"
            )
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": settings.owner_chat_id, "text": msg},
                    timeout=5
                )
            except Exception:
                pass

    return {"status": "success", "message": "ลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแล"}


# 3. Bot register (called by Telegram bot — keeps status=active)
@router.post("/register", response_model=EmployeeResponse)
def register_employee(data: EmployeeRegister, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.join_code == data.join_code).first()
    if not company:
        raise HTTPException(status_code=404, detail="Invalid join code")

    existing = db.query(Employee).filter(Employee.chat_id == data.chat_id).first()
    if existing:
        existing.full_name = data.full_name
        existing.company_id = company.id
        existing.status = "active"
        existing.terms_accepted = True
        existing.terms_version = "v1.0"
        existing.accepted_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    new_employee = Employee(
        company_id=company.id,
        chat_id=data.chat_id,
        full_name=data.full_name,
        status="active",
        terms_accepted=True,
        terms_version="v1.0",
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if settings and settings.owner_chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            msg = (
                f"👤 พนักงานใหม่\n"
                f"ชื่อ: {new_employee.full_name}\n"
                f"เวลา: {new_employee.created_at.strftime('%H:%M น.')}"
            )
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": settings.owner_chat_id, "text": msg},
                    timeout=5
                )
            except Exception:
                pass

    return new_employee


# 4. Approve pending employee
@router.post("/{employee_id}/approve")
def approve_employee(
    employee_id: str,
    data: EmployeeApprove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.status = "active"
    employee.base_rate = data.base_rate
    employee.employment_type = data.employment_type
    if data.position:
        employee.position = data.position
    if data.department:
        employee.department = data.department

    db.commit()

    # Notify employee via Telegram if they have a chat_id
    if employee.chat_id:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token:
            msg = (
                f"✅ ยินดีด้วย! บัญชีของคุณได้รับการอนุมัติแล้ว\n"
                f"คุณสามารถเริ่มใช้งานระบบเช็กอินได้ทันที\n"
                f"พิมพ์ /menu เพื่อเปิดเมนูการใช้งาน"
            )
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": employee.chat_id, "text": msg},
                    timeout=5
                )
            except Exception:
                pass

    return {"status": "success", "message": "อนุมัติพนักงานเรียบร้อยแล้ว"}


# 5. Reject pending employee
@router.post("/{employee_id}/reject")
def reject_employee(
    employee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.status = "inactive"
    db.commit()
    return {"status": "success", "message": "ปฏิเสธพนักงานเรียบร้อยแล้ว"}


# 6. Delete an employee
@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User is not associated with a company")
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or doesn't belong to your company")
    db.delete(employee)
    db.commit()
    return None


# 7. Update employee details
@router.put("/{employee_id}")
def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User is not associated with a company")
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    for field in ["full_name", "status", "base_rate", "employment_type",
                  "phone", "email", "position", "department",
                  "start_date", "bank_account", "bank_name", "id_card", "day_off"]:
        val = getattr(data, field)
        if val is not None:
            setattr(employee, field, val)

    db.commit()
    db.refresh(employee)
    return {"status": "success", "message": "อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว"}


@router.get("/bot/list")
def get_bot_employee_list(owner_chat_id: str, db: Session = Depends(get_db)):
    settings = db.query(CompanySettings).filter(CompanySettings.owner_chat_id == owner_chat_id).first()
    if not settings:
        raise HTTPException(status_code=403, detail="Unauthorized: Chat ID is not registered as an owner")
    employees = db.query(Employee).filter(
        Employee.company_id == settings.company_id,
        Employee.status == "active"
    ).all()
    return {"employees": [{"chat_id": emp.chat_id, "name": emp.full_name} for emp in employees]}


# 8. Register Face ID (called by Telegram Bot)
@router.post("/register-face")
async def register_face(chat_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="ไฟล์รูปภาพไม่ถูกต้อง")

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    if len(faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="ไม่พบใบหน้าในรูปถ่าย กรุณาส่งรูปถ่ายหน้าตรงที่เห็นใบหน้าของคุณชัดเจนครับ"
        )

    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลพนักงานในระบบ")

    storage_dir = os.path.join("storage", "faces")
    os.makedirs(storage_dir, exist_ok=True)
    file_path = os.path.join(storage_dir, f"{chat_id}.jpg")
    cv2.imwrite(file_path, img)

    employee.face_registered = True
    employee.face_photo_path = file_path
    db.commit()

    return {"status": "success", "message": "ลงทะเบียน Face ID เรียบร้อยแล้ว"}


@router.get("/bot/history")
def get_employee_history(chat_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    checkins = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= month_start
    ).all()

    late_cutoff = time(8, 30)
    worked_dates = set()
    late_count = 0
    for c in checkins:
        local_time = c.check_in_time.astimezone(TZ_BANGKOK)
        worked_dates.add(local_time.date().isoformat())
        if local_time.time() > late_cutoff:
            late_count += 1

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status == 'approved',
        LeaveRequest.created_at >= month_start
    ).all()

    return {
        "days_worked": len(worked_dates),
        "late_count": late_count,
        "leaves_count": len(leaves)
    }


@router.get("/bot/salary")
def get_bot_salary(chat_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.chat_id == chat_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    now_bangkok = datetime.now(TZ_BANGKOK)
    month_start = now_bangkok.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_name = now_bangkok.strftime("%B %Y")

    checkins = db.query(Checkin).filter(
        Checkin.employee_id == employee.id,
        Checkin.check_in_time >= month_start
    ).all()

    days_worked_set = set()
    hours_worked = 0.0
    for c in checkins:
        local_in = c.check_in_time.astimezone(TZ_BANGKOK)
        days_worked_set.add(local_in.date().isoformat())
        if c.check_out_time:
            hours_worked += (c.check_out_time - c.check_in_time).total_seconds() / 3600.0

    days_worked = len(days_worked_set)
    base_rate = employee.base_rate or 0.0
    emp_type = employee.employment_type or "monthly"

    if emp_type == "monthly":
        total = base_rate
        rate_label = f"{base_rate:,.0f} บาท/เดือน"
    elif emp_type == "daily":
        total = days_worked * base_rate
        rate_label = f"{base_rate:,.0f} บาท/วัน"
    else:
        total = round(hours_worked, 2) * base_rate
        rate_label = f"{base_rate:,.0f} บาท/ชั่วโมง"

    return {
        "full_name": employee.full_name,
        "month": month_name,
        "employment_type": emp_type,
        "rate_label": rate_label,
        "days_worked": days_worked,
        "hours_worked": round(hours_worked, 1),
        "total_payroll": round(total, 2)
    }


@router.get("/payroll")
def get_payroll(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["owner", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from ..core.models import PayrollExtra, PayrollDeduction

    now_bangkok = datetime.now(TZ_BANGKOK)
    target_month = month or now_bangkok.month
    target_year = year or now_bangkok.year

    # Build month start/end in Bangkok time, converted to UTC for DB query
    month_start = datetime(target_year, target_month, 1, tzinfo=TZ_BANGKOK)
    if target_month == 12:
        month_end = datetime(target_year + 1, 1, 1, tzinfo=TZ_BANGKOK)
    else:
        month_end = datetime(target_year, target_month + 1, 1, tzinfo=TZ_BANGKOK)

    if current_user.company_id:
        employees = db.query(Employee).filter(
            Employee.company_id == current_user.company_id,
            Employee.status == "active"
        ).all()
    else:
        employees = db.query(Employee).filter(Employee.status == "active").all()

    results = []
    for emp in employees:
        checkins = db.query(Checkin).filter(
            Checkin.employee_id == emp.id,
            Checkin.check_in_time >= month_start,
            Checkin.check_in_time < month_end
        ).all()

        days_worked_set = set()
        hours_worked = 0.0
        for c in checkins:
            local_in = c.check_in_time.astimezone(TZ_BANGKOK)
            days_worked_set.add(local_in.date().isoformat())
            if c.check_out_time:
                hours_worked += (c.check_out_time - c.check_in_time).total_seconds() / 3600.0

        days_worked = len(days_worked_set)
        base_rate = emp.base_rate or 0.0
        emp_type = emp.employment_type or "monthly"

        if emp_type == "monthly":
            base_salary = base_rate
        elif emp_type == "daily":
            base_salary = days_worked * base_rate
        else:
            base_salary = hours_worked * base_rate

        # Extras and deductions
        extras = db.query(PayrollExtra).filter(
            PayrollExtra.employee_id == emp.id,
            PayrollExtra.month == target_month,
            PayrollExtra.year == target_year
        ).all()
        deductions = db.query(PayrollDeduction).filter(
            PayrollDeduction.employee_id == emp.id,
            PayrollDeduction.month == target_month,
            PayrollDeduction.year == target_year
        ).all()

        extra_total = sum(e.amount for e in extras)
        deduction_total = sum(d.amount for d in deductions)
        net = base_salary + extra_total - deduction_total

        results.append({
            "id": emp.id,
            "full_name": emp.full_name,
            "position": emp.position,
            "department": emp.department,
            "employment_type": emp_type,
            "base_rate": base_rate,
            "days_worked": days_worked,
            "hours_worked": round(hours_worked, 2),
            "base_salary": round(base_salary, 2),
            "extra_total": round(extra_total, 2),
            "deduction_total": round(deduction_total, 2),
            "net_income": round(net, 2),
            "total_payroll": round(net, 2),
            "extras": [{"id": e.id, "type": e.type, "amount": e.amount, "description": e.description} for e in extras],
            "deductions": [{"id": d.id, "type": d.type, "amount": d.amount, "description": d.description} for d in deductions],
        })

    return results
