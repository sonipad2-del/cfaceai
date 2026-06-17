from telegram import Update
from telegram.ext import ContextTypes, MessageHandler, filters
import os
import requests

API_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")

async def show_history(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    
    try:
        response = requests.get(f"{API_BASE_URL}/employees/bot/history?chat_id={chat_id}")
        if response.status_code == 200:
            data = response.json()
            days_worked = data.get("days_worked", 0)
            late_count = data.get("late_count", 0)
            leaves_count = data.get("leaves_count", 0)
            
            message = (
                "📊 ประวัติการทำงานประจำเดือนนี้\n"
                f"✅ มาทำงาน: {days_worked} วัน\n"
                f"⏰ มาสาย: {late_count} ครั้ง\n"
                f"📝 ลางาน: {leaves_count} วัน"
            )
            await update.message.reply_text(message)
        else:
            await update.message.reply_text("❌ ไม่พบข้อมูลพนักงานในระบบ หรือเกิดข้อผิดพลาดในการดึงข้อมูล")
    except Exception as e:
        print(f"Error fetching history: {e}")
        await update.message.reply_text("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์")

history_handler = MessageHandler(filters.Regex("^📊 ดูประวัติของฉัน$"), show_history)
