from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..core.models import Employee, User, PayrollExtra, PayrollDeduction
from ..core.dependencies import get_current_user
from .schemas import PayrollExtraCreate, PayrollDeductionCreate

router = APIRouter(prefix="/payroll", tags=["Payroll"])


@router.get("/extras")
def get_extras(
    employee_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(PayrollExtra)
    if current_user.company_id:
        q = q.filter(PayrollExtra.company_id == current_user.company_id)
    if employee_id:
        q = q.filter(PayrollExtra.employee_id == employee_id)
    if month:
        q = q.filter(PayrollExtra.month == month)
    if year:
        q = q.filter(PayrollExtra.year == year)
    items = q.all()
    return [{"id": i.id, "employee_id": i.employee_id, "type": i.type,
             "amount": i.amount, "description": i.description,
             "month": i.month, "year": i.year} for i in items]


@router.post("/extras")
def add_extra(
    data: PayrollExtraCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    item = PayrollExtra(
        company_id=current_user.company_id,
        employee_id=data.employee_id,
        type=data.type,
        amount=data.amount,
        description=data.description,
        month=data.month,
        year=data.year
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "status": "success"}


@router.delete("/extras/{extra_id}")
def delete_extra(
    extra_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(PayrollExtra).filter(
        PayrollExtra.id == extra_id,
        PayrollExtra.company_id == current_user.company_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Extra not found")
    db.delete(item)
    db.commit()
    return {"status": "success"}


@router.get("/deductions")
def get_deductions(
    employee_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(PayrollDeduction)
    if current_user.company_id:
        q = q.filter(PayrollDeduction.company_id == current_user.company_id)
    if employee_id:
        q = q.filter(PayrollDeduction.employee_id == employee_id)
    if month:
        q = q.filter(PayrollDeduction.month == month)
    if year:
        q = q.filter(PayrollDeduction.year == year)
    items = q.all()
    return [{"id": i.id, "employee_id": i.employee_id, "type": i.type,
             "amount": i.amount, "description": i.description,
             "month": i.month, "year": i.year} for i in items]


@router.post("/deductions")
def add_deduction(
    data: PayrollDeductionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    item = PayrollDeduction(
        company_id=current_user.company_id,
        employee_id=data.employee_id,
        type=data.type,
        amount=data.amount,
        description=data.description,
        month=data.month,
        year=data.year
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "status": "success"}


@router.delete("/deductions/{deduction_id}")
def delete_deduction(
    deduction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(PayrollDeduction).filter(
        PayrollDeduction.id == deduction_id,
        PayrollDeduction.company_id == current_user.company_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deduction not found")
    db.delete(item)
    db.commit()
    return {"status": "success"}
