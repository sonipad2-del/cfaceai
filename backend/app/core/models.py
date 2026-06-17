import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Index, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from datetime import datetime, timezone
from .database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise CHAR(36), storing as string.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)

class Company(Base):
    __tablename__ = "companies"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    join_code = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    settings = relationship("CompanySettings", back_populates="company", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    ads = relationship("Ad", back_populates="company", cascade="all, delete-orphan")

class CompanySettings(Base):
    __tablename__ = "company_settings"

    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    office_lat = Column(Float, default=13.7261)
    office_lng = Column(Float, default=100.5260)
    radius = Column(Float, default=200.0)
    owner_chat_id = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="settings")

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="owner")
    telegram_id = Column(String(100), unique=True, nullable=True)
    terms_accepted = Column(Boolean, default=False)
    terms_version = Column(String(50), default="v1.0")
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="users")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    chat_id = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    status = Column(String(50), default="active") # 'active', 'inactive'
    face_registered = Column(Boolean, default=False)
    face_photo_path = Column(String(255), nullable=True)
    base_rate = Column(Float, default=0.0)
    employment_type = Column(String(50), default="monthly")
    terms_accepted = Column(Boolean, default=False)
    terms_version = Column(String(50), default="v1.0")
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="employees")
    checkins = relationship("Checkin", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")

class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(GUID(), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    distance_in = Column(Float, nullable=True)
    distance_out = Column(Float, nullable=True)
    match_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="checkins")

class Ad(Base):
    __tablename__ = "ads"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    image_url = Column(String(1000), nullable=False)
    affiliate_url = Column(String(1000), nullable=False)
    time_slot = Column(String(50), nullable=False, index=True) # 'morning', 'afternoon', 'evening', 'night'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="ads")
    logs = relationship("AdLog", back_populates="ad", cascade="all, delete-orphan")

class AdLog(Base):
    __tablename__ = "ad_logs"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    ad_id = Column(GUID(), ForeignKey("ads.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(GUID(), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(50), nullable=False) # 'impression', 'click'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ad = relationship("Ad", back_populates="logs")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(GUID(), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)
    start_date = Column(String(100), nullable=False)
    end_date = Column(String(100), nullable=True)
    total_days = Column(Integer, default=1)
    reason = Column(String(255), nullable=False)
    attachment_path = Column(String(255), nullable=True)
    status = Column(String(50), default="pending") # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="leave_requests")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String, nullable=False)
    image_url = Column(String(1000), nullable=True)
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="sent")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sent_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company")
    creator = relationship("User")
    logs = relationship("AnnouncementLog", back_populates="announcement", cascade="all, delete-orphan")

class AnnouncementLog(Base):
    __tablename__ = "announcement_logs"

    id = Column(GUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
    announcement_id = Column(GUID(), ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(GUID(), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)

    announcement = relationship("Announcement", back_populates="logs")
    employee = relationship("Employee")

