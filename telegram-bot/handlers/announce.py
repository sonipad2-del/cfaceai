from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, MessageHandler, CallbackQueryHandler, CommandHandler, filters
from services.api import create_announcement, mark_announcement_read
from handlers.owner import get_owner_menu_keyboard

WAITING_FOR_ANNOUNCE = 0
CONFIRM_ANNOUNCE = 1

async def start_announce(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📣 *สร้างประกาศบริษัท*\n\n"
        "กรุณาพิมพ์ข้อความที่คุณต้องการประกาศให้พนักงานทุกคนทราบครับ\n"
        "(รองรับข้อความอย่างเดียวในขณะนี้ หากต้องการยกเลิกพิมพ์ /cancel)",
        parse_mode="Markdown"
    )
    return WAITING_FOR_ANNOUNCE

async def handle_announce_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    context.user_data['announce_text'] = text
    
    keyboard = [
        [
            InlineKeyboardButton("🚀 ยืนยันส่งให้พนักงานทุกคน", callback_data="send_announce"),
            InlineKeyboardButton("❌ ยกเลิก", callback_data="cancel_announce")
        ]
    ]
    
    await update.message.reply_text(
        f"📝 *ตัวอย่างประกาศ:*\n\n{text}\n\nคุณต้องการส่งประกาศนี้หรือไม่?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return CONFIRM_ANNOUNCE

async def handle_confirm_announce(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel_announce":
        await query.edit_message_text("❌ ยกเลิกการส่งประกาศแล้ว")
        context.user_data.clear()
        return ConversationHandler.END
        
    chat_id = str(update.effective_chat.id)
    text = context.user_data.get('announce_text')
    
    result = create_announcement(chat_id, text)
    if result and result.get("status") == "success":
        announcement_id = result.get("announcement_id")
        emp_ids = result.get("employee_chat_ids", [])
        
        # Broadcast to all employees
        keyboard = [[InlineKeyboardButton("👁️ รับทราบแล้ว", callback_data=f"read_announce_{announcement_id}")]]
        markup = InlineKeyboardMarkup(keyboard)
        
        sent_count = 0
        for emp_chat_id in emp_ids:
            try:
                await context.bot.send_message(
                    chat_id=emp_chat_id,
                    text=f"📣 *ประกาศจากบริษัท!*\n\n{text}",
                    parse_mode="Markdown",
                    reply_markup=markup
                )
                sent_count += 1
            except Exception as e:
                print(f"Failed to send to {emp_chat_id}: {e}")
                
        await query.edit_message_text(f"✅ ส่งประกาศสำเร็จ!\n👥 ส่งถึงพนักงานแล้ว {sent_count}/{len(emp_ids)} คน")
    else:
        await query.edit_message_text("❌ เกิดข้อผิดพลาด ไม่สามารถส่งประกาศได้")
        
    context.user_data.clear()
    return ConversationHandler.END

async def handle_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ ยกเลิกการส่งประกาศแล้ว", reply_markup=get_owner_menu_keyboard())
    context.user_data.clear()
    return ConversationHandler.END

announce_conv = ConversationHandler(
    entry_points=[MessageHandler(filters.Regex("^📣 ส่งประกาศ$"), start_announce)],
    states={
        WAITING_FOR_ANNOUNCE: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_announce_text)],
        CONFIRM_ANNOUNCE: [CallbackQueryHandler(handle_confirm_announce, pattern="^(send|cancel)_announce$")]
    },
    fallbacks=[CommandHandler("cancel", handle_cancel)]
)

async def read_announce_handler_func(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer("บันทึกการรับทราบแล้ว ขอบคุณครับ!")
    
    # query.data format: read_announce_{id}
    announcement_id = query.data.replace("read_announce_", "")
    chat_id = str(update.effective_chat.id)
    
    mark_announcement_read(chat_id, announcement_id)
    
    # Remove the inline keyboard
    await query.edit_message_reply_markup(reply_markup=None)
    await query.edit_message_text(f"{query.message.text}\n\n*✅ คุณได้รับทราบประกาศนี้แล้ว*")

read_announce_handler = CallbackQueryHandler(read_announce_handler_func, pattern="^read_announce_.*$")
