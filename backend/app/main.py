import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .core.database import engine, Base
from .api import auth, companies, employees, checkins, ads, leaves, announcements, bot, payroll_extras, advance
from .api import admin

FRONTEND_URLS = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")


def run_migrations():
    """Add new columns to existing tables (idempotent)."""
    statements = [
        "ALTER TABLE employees ALTER COLUMN chat_id DROP NOT NULL",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(100)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_date VARCHAR(50)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card VARCHAR(20)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS day_off VARCHAR(50)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image TEXT",
    ]
    try:
        with engine.connect() as conn:
            for sql in statements:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
            conn.commit()
    except Exception as e:
        print(f"Migration warning: {e}")


try:
    run_migrations()
except Exception:
    pass

# Create new tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nova7 Check-in & Ads API",
    description="Backend service for Telegram check-ins and affiliate ads dashboard",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(employees.router)
app.include_router(checkins.router)
app.include_router(ads.router)
app.include_router(leaves.router, prefix="/api/leaves", tags=["Leaves"])
app.include_router(announcements.router)
app.include_router(bot.router)
app.include_router(admin.router)
app.include_router(payroll_extras.router)
app.include_router(advance.router)

@app.get("/")
def root():
    return {"message": "Welcome to Nova7 API. The system is online."}
