import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine, Base
from .api import auth, companies, employees, checkins, ads, leaves, announcements, bot
from .api import admin

FRONTEND_URLS = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")

# Create database tables automatically (mainly for SQLite or when starting fresh)
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

@app.get("/")
def root():
    return {"message": "Welcome to Nova7 API. The system is online."}
