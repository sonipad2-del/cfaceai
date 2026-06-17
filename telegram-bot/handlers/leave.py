import os
import requests
import uuid
import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, MessageHandler, CallbackQueryHandler, filters
from telegram_bot_calendar import DetailedTelegramCalendar, LSTEP

from dotenv import load_dotenv

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:8080")

(
    SELECT_TYPE, 
    START_DATE_CALENDAR, 
    END_DATE_CALENDAR, 
    ENTER_REASON, 
    UPLOAD_DOC,
    CONFIRM_LEAVE
) = range(6)

def build_calendar(min_date=None):
    # LSTEP translates steps to Thai
    calendar, step = DetailedTelegramCalendar(min_date=min_date, locale='th').build()
    return calendar, step

async def start_leave(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("ลาป่วย", callback_data="type_ลาป่วย"),
            InlineKeyboardButton("ลากิจ", callback_data="type_ลากิจ")
        ],
        [
            InlineKeyboardButton("ลาพักร้อน", callback_data="type_ลาพักร้อน"),
            InlineKeyboardButton("ลาด่วน", callback_data="type_ลาด่วน")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("📝 เลือกประเภทการลา:", reply_markup=reply_markup)
    return SELECT_TYPE

async def handle_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    leave_type = query.data.replace("type_", "")
    context.user_data['leave_type'] = leave_type
    
    calendar, step = build_calendar()
    await query.edit_message_text(
        text=f"ประเภท: {leave_type}\n📅 กรุณาเลือก **วันเริ่มลา**:",
        reply_markup=calendar,
        parse_mode="Markdown"
    )
    return START_DATE_CALENDAR

async def handle_start_date_calendar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    result, key, step = DetailedTelegramCalendar(locale='th').process(query.data)
    if not result and key:
        await query.edit_message_text(
            text=f"📅 กรุณาเลือก **วันเริ่มลา**:",
            reply_markup=key,
            parse_mode="Markdown"
        )
        return START_DATE_CALENDAR
    elif result:
        context.user_data['start_date'] = result # datetime.date object
        
        # Now ask for end date, setting min_date to start_date
        calendar, step = build_calendar(min_date=result)
        await query.edit_message_text(
            text=f"วันเริ่มลา: {result.strftime('%d/%m/%Y')}\n📅 กรุณาเลือก **วันสิ้นสุดการลา**:",
            reply_markup=calendar,
            parse_mode="Markdown"
        )
        return END_DATE_CALENDAR

async def handle_end_date_calendar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    min_date = context.user_data.get('start_date')
    result, key, step = DetailedTelegramCalendar(min_date=min_date, locale='th').process(query.data)
    
    if not result and key:
        await query.edit_message_text(
            text=f"📅 กรุณาเลือก **วันสิ้นสุดการลา**:",
            reply_markup=key,
            parse_mode="Markdown"
        )
        return END_DATE_CALENDAR
    elif result:
        context.user_data['end_date'] = result
        
        # Calculate days
        start = context.user_data['start_date']
        end = result
        days = (end - start).days + 1
        context.user_data['total_days'] = days
        
        await query.edit_message_text(
            text=f"📅 วันที่ลา: {start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')} (รวม {days} วัน)\n\n📝 ระบุเหตุผลการลา (พิมพ์ส่งมาได้เลยครับ):"
        )
        return ENTER_REASON

async def handle_reason(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['reason'] = update.message.text
    await update.message.reply_text("📎 แนบใบรับรองแพทย์/เอกสารประกอบ (ส่งเป็นรูปภาพ) หรือพิมพ์ 'ข้าม'")
    return UPLOAD_DOC

async def handle_doc(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    attachment_path = None

    if update.message.photo:
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        
        upload_dir = os.path.join("storage", "uploads", "leaves")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_name = f"{chat_id}_{uuid.uuid4().hex}.jpg"
        file_path = os.path.join(upload_dir, file_name)
        await file.download_to_drive(file_path)
        attachment_path = file_path
        
    context.user_data['attachment_path'] = attachment_path

    # Summary
    leave_type = context.user_data['leave_type']
    start_str = context.user_data['start_date'].strftime('%d/%m/%Y')
    end_str = context.user_data['end_date'].strftime('%d/%m/%Y')
    days = context.user_data['total_days']
    reason = context.user_data['reason']
    
    summary = (
        f"📝 **สรุปคำขอลา**\n\n"
        f"ประเภท: {leave_type}\n"
        f"วันที่: {start_str} - {end_str}\n"
        f"รวม: {days} วัน\n"
        f"เหตุผล: {reason}\n\n"
        f"ยืนยันการส่งคำขอลาหรือไม่?"
    )
    
    keyboard = [
        [
            InlineKeyboardButton("✅ ยืนยันส่ง", callback_data="confirm_leave_yes"),
            InlineKeyboardButton("✏️ ยกเลิกเพื่อทำใหม่", callback_data="confirm_leave_no")
        ]
    ]
    
    await update.message.reply_text(summary, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
    return CONFIRM_LEAVE

async def handle_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "confirm_leave_no":
        await query.edit_message_text("❌ ยกเลิกคำขอลาแล้ว คุณสามารถกด /menu เพื่อเริ่มต้นใหม่ได้ครับ")
        context.user_data.clear()
        return ConversationHandler.END
        
    # Submit to backend
    chat_id = str(update.effective_chat.id)
    start_str = context.user_data['start_date'].strftime('%d/%m/%Y')
    end_str = context.user_data['end_date'].strftime('%d/%m/%Y')
    
    payload = {
        "chat_id": chat_id,
        "leave_type": context.user_data.get('leave_type'),
        "start_date": start_str,
        "end_date": end_str,
        "total_days": context.user_data.get('total_days'),
        "reason": context.user_data.get('reason'),
        "attachment_path": context.user_data.get('attachment_path')
    }

    try:
        response = requests.post(f"{BACKEND_URL}/api/leaves/submit", json=payload)
        response.raise_for_status()
        await query.edit_message_text("✅ ส่งคำขอลาเรียบร้อยแล้ว รอการอนุมัติจากเจ้าของ")
    except requests.RequestException as e:
        await query.edit_message_text("❌ เกิดข้อผิดพลาดในการส่งคำขอลา กรุณาลองใหม่อีกครั้ง")
        print("Error calling backend:", e)

    context.user_data.clear()
    return ConversationHandler.END


leave_conv = ConversationHandler(
    entry_points=[MessageHandler(filters.Regex("^📝 แจ้งลางาน$"), start_leave)],
    states={
        SELECT_TYPE: [CallbackQueryHandler(handle_type, pattern="^type_.*$")],
        START_DATE_CALENDAR: [CallbackQueryHandler(handle_start_date_calendar, pattern="^cbcal.*$")],
        END_DATE_CALENDAR: [CallbackQueryHandler(handle_end_date_calendar, pattern="^cbcal.*$")],
        ENTER_REASON: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_reason)],
        UPLOAD_DOC: [MessageHandler((filters.PHOTO | filters.TEXT) & ~filters.COMMAND, handle_doc)],
        CONFIRM_LEAVE: [CallbackQueryHandler(handle_confirm, pattern="^confirm_leave_.*$")]
    },
    fallbacks=[]
)

async def handle_approval(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    # The pattern is ^(approve|reject)_leave_(.*)$
    data_parts = query.data.split('_')
    action = data_parts[0] # approve or reject
    leave_id = "_".join(data_parts[2:])

    status = "approved" if action == "approve" else "rejected"
    payload = {"status": status}

    try:
        response = requests.put(f"{BACKEND_URL}/api/bot/leaves/{leave_id}/status", json=payload)
        response.raise_for_status()
        data = response.json()
        
        emp_chat_id = data.get("employee_chat_id")
        emp_name = data.get("employee_name")

        if status == "approved":
            await query.edit_message_text(f"✅ คุณได้อนุมัติการลาของ {emp_name}")
            if emp_chat_id:
                await context.bot.send_message(chat_id=emp_chat_id, text=f"✅ คำขอลาของคุณได้รับการอนุมัติ")
        else:
            await query.edit_message_text(f"❌ คุณปฏิเสธการลาของ {emp_name}")
            if emp_chat_id:
                await context.bot.send_message(chat_id=emp_chat_id, text=f"❌ คำขอลาของคุณไม่ได้รับการอนุมัติ")

    except requests.RequestException as e:
        await query.edit_message_text("❌ เกิดข้อผิดพลาดในการอัพเดทสถานะ")
        print("Error calling backend for approval:", e)

leave_approval_handler = CallbackQueryHandler(handle_approval, pattern="^(approve|reject)_leave_(.*)$")
