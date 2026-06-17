from telegram import Update
from telegram.ext import ContextTypes, MessageHandler, filters
from services.api import get_bot_salary
from handlers.menu import get_main_menu_keyboard

async def handle_salary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    data = get_bot_salary(str(chat_id))

    if not data:
        await update.message.reply_text(
            "❌ ไม่พบข้อมูลเงินเดือนของคุณในระบบ\n"
            "กรุณาติดต่อเจ้าของกิจการเพื่อตั้งค่าอัตราค่าจ้างครับ"
        )
        return

    emp_type_map = {"monthly": "รายเดือน", "daily": "รายวัน", "hourly": "รายชั่วโมง"}
    emp_type = data.get("employment_type", "monthly")
    emp_type_label = emp_type_map.get(emp_type, "รายเดือน")

    days = data.get("days_worked", 0)
    hours = data.get("hours_worked", 0.0)
    total = data.get("total_payroll", 0.0)
    rate_label = data.get("rate_label", "-")
    month = data.get("month", "เดือนนี้")
    name = data.get("full_name", "")

    if emp_type == "daily":
        detail_line = f"📅 วันทำงาน: {days} วัน x {rate_label}"
    elif emp_type == "hourly":
        detail_line = f"⏱ ชั่วโมงทำงาน: {hours} ชม. x {rate_label}"
    else:
        detail_line = f"💼 ประเภท: {emp_type_label} | {rate_label}"

    msg = (
        f"💰 สรุปเงินเดือน\n"
        f"{'─'*28}\n"
        f"👤 {name}\n"
        f"📆 ประจำเดือน: {month}\n"
        f"{detail_line}\n"
        f"{'─'*28}\n"
        f"💵 ยอดสุทธิ (ประมาณ): {total:,.2f} บาท\n\n"
        f"ยอดจริงจะคำนวณโดยเจ้าของกิจการครับ"
    )
    await update.message.reply_text(msg)


async def handle_unknown_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    from services.api import get_user_role
    user_info = get_user_role(chat_id)
    is_dual = user_info.get("is_dual_role", False) if user_info else False
    
    await update.message.reply_text(
        "🤔 ไม่เข้าใจคำสั่งครับ\nกรุณาเลือกจากเมนูด้านล่างได้เลยครับ 👇",
        reply_markup=get_main_menu_keyboard(is_dual)
    )


salary_handler = MessageHandler(filters.Regex("^💰 เช็กเงินเดือน$"), handle_salary)
unknown_handler = MessageHandler(filters.TEXT & ~filters.COMMAND, handle_unknown_text)
