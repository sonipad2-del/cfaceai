from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import ContextTypes, CommandHandler

def get_main_menu_keyboard(is_dual=False):
    keyboard = [
        [KeyboardButton("📍 ส่งตำแหน่ง (เช็กอิน / เช็กเอาต์)", request_location=True)],
        [KeyboardButton("📝 แจ้งลางาน"), KeyboardButton("💰 เช็กเงินเดือน")],
        [KeyboardButton("📊 ดูประวัติของฉัน")]
    ]
    if is_dual:
        keyboard.append([KeyboardButton("👑 โหมดเจ้าของร้าน")])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, is_persistent=True)

from services.api import get_user_role
from handlers.owner import get_owner_menu_keyboard, get_superadmin_menu_keyboard, show_owner_dashboard

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    user_info = get_user_role(chat_id)
    
    if user_info:
        role = user_info.get("role")
        is_dual = user_info.get("is_dual_role", False)
        
        if role == "superadmin":
            await update.message.reply_text(
                "👑 เลือกระบบจัดการด้านล่าง:",
                reply_markup=get_superadmin_menu_keyboard()
            )
        elif role == "owner":
            await show_owner_dashboard(update, context, is_dual)
        else:
            await update.message.reply_text(
                "👇 เลือกเมนูด้านล่างเพื่อทำรายการได้เลยครับ",
                reply_markup=get_main_menu_keyboard(is_dual)
            )
    else:
        await update.message.reply_text(
            "คุณยังไม่ได้ลงทะเบียนในระบบ กรุณาสแกน QR Code จากที่ทำงานเพื่อเข้าร่วม"
        )

from telegram.ext import CommandHandler, MessageHandler, filters

menu_handler = MessageHandler(filters.Regex(r"^/menu\b") | (filters.COMMAND & filters.Regex(r"^/menu\b")), menu_command)
