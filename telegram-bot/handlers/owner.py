from telegram import Update, ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, MessageHandler, filters
from services.api import get_owner_dashboard, get_pending_leaves

def get_owner_menu_keyboard(is_dual=False):
    keyboard = [
        ["📊 สรุปงานวันนี้", "📝 อนุมัติลา"],
        ["📢 แจ้งประกาศ", "🎁 ดูแคมเปญพนักงาน"],
        ["⚙️ ตั้งค่า", "📞 ติดต่อผู้พัฒนา"]
    ]
    if is_dual:
        keyboard.append(["👤 โหมดพนักงาน"])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

def get_superadmin_menu_keyboard():
    keyboard = [
        ["🏢 จัดการบริษัททั้งหมด", "📢 Broadcast ระบบ"],
        ["💰 ระบบรายได้", "⚙️ ตั้งค่าระบบ"]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

async def show_owner_dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE, is_dual=False):
    chat_id = str(update.effective_chat.id)
    dashboard_data = get_owner_dashboard(chat_id)
    
    if dashboard_data:
        text = (
            f"🏢 *{dashboard_data['company_name']}*\n"
            f"👥 พนักงานทั้งหมด: {dashboard_data['total_emp']} คน\n\n"
            f"✅ เข้างานแล้ว: {dashboard_data['present']} คน\n"
            f"⏰ สาย: {dashboard_data['late']} คน\n"
            f"❌ ยังไม่เข้า/ขาด: {dashboard_data['absent']} คน\n"
            f"📝 รออนุมัติลา: {dashboard_data['pending_leaves']} รายการ\n"
        )
    else:
        text = "🏢 *Nova7 Dashboard*\nไม่สามารถดึงข้อมูลสรุปได้ในขณะนี้"
        
    await update.message.reply_text(
        text,
        parse_mode="Markdown",
        reply_markup=get_owner_menu_keyboard(is_dual)
    )

async def handle_owner_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    chat_id = str(update.effective_chat.id)
    
    if text == "📊 รายงานวันนี้":
        await show_owner_dashboard(update, context)
    elif text == "📝 คำขอลา":
        pending = get_pending_leaves(chat_id)
        if not pending:
            await update.message.reply_text("✅ คุณไม่มีคำขอลาที่รออนุมัติ")
        else:
            await update.message.reply_text(f"📝 มีคำขอลาที่รออนุมัติ {len(pending)} รายการ:")
            for leave in pending:
                msg = (
                    f"พนักงาน: {leave['employee_name']}\n"
                    f"ประเภท: {leave['leave_type']}\n"
                    f"วันที่: {leave['start_date']} - {leave['end_date']} (รวม {leave['total_days']} วัน)\n"
                    f"เหตุผล: {leave['reason']}"
                )
                keyboard = [
                    [
                        InlineKeyboardButton("✅ อนุมัติ", callback_data=f"approve_leave_{leave['id']}"),
                        InlineKeyboardButton("❌ ไม่อนุมัติ", callback_data=f"reject_leave_{leave['id']}")
                    ]
                ]
                await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
                
    elif text == "🎁 โปรโมชั่นพนักงาน":
        from services.api import get_owner_promotions
        ads = get_owner_promotions(chat_id)
        if ads and len(ads) > 0:
            for ad in ads:
                if ad.get("image_url"):
                    await update.message.reply_photo(photo=ad["image_url"], caption=ad["message"])
                else:
                    await update.message.reply_text(ad["message"])
        else:
            await update.message.reply_text("ขณะนี้ยังไม่มีโปรโมชั่นพิเศษครับ")
            
    elif text == "⚙️ ตั้งค่า":
        await update.message.reply_text(
            "⚙️ *การตั้งค่าระบบ*\n\n"
            "กรุณาตั้งค่าผ่าน Web Dashboard ที่:\n"
            "🌐 https://nova7.pro\n\n"
            "คุณสามารถเพิ่ม/ลบพนักงาน และกำหนดพิกัด GPS ได้ที่นั่นครับ",
            parse_mode="Markdown"
        )
        
    elif text == "📞 ติดต่อผู้พัฒนา":
        await update.message.reply_text(
            "📞 *ติดต่อผู้พัฒนา / เสนอแนะ*\n\n"
            "พบปัญหา หรือต้องการฟีเจอร์ใหม่ๆ แจ้งทีมงานได้เลยครับ!\n\n"
            "📱 *Telegram:* @son\_sontaya\n"
            "☎️ *เบอร์โทรศัพท์:* 088-272-7597\n\n"
            "💡 *ต้องการฟีเจอร์อะไรเพิ่มไหม?*\n"
            "เรารับฟังทุกความคิดเห็นและข้อเสนอแนะจากเจ้าของกิจการทุกท่าน! ไม่ว่าจะเป็นระบบรายงานรูปแบบใหม่ การคำนวณเงินเดือนที่ซับซ้อนขึ้น หรือการเชื่อมต่อกับระบบอื่น\n\n"
            "🎉 *และที่สำคัญ...* เรากำลังเร่งพัฒนาอีกหลายฟีเจอร์เจ๋งๆ ออกมาให้ผู้ใช้งานปัจจุบันได้ \"ใช้กันแบบฟรีๆ\" ในเร็วๆ นี้ครับ!",
            parse_mode="Markdown"
        )
    elif text == "👤 โหมดพนักงาน":
        from handlers.menu import get_main_menu_keyboard
        # Note: if they can see this button, is_dual is True
        await update.message.reply_text("👇 สลับมาโหมดพนักงานแล้วครับ", reply_markup=get_main_menu_keyboard(is_dual=True))
    elif text == "👑 โหมดเจ้าของร้าน":
        # They want to switch back to Owner mode
        await show_owner_dashboard(update, context, is_dual=True)
    else:
        await update.message.reply_text("ไม่รู้จักคำสั่งนี้")

owner_text_handler = MessageHandler(
    filters.Text(["📊 รายงานวันนี้", "📝 คำขอลา", "🎁 โปรโมชั่นพนักงาน", "⚙️ ตั้งค่า", "👤 โหมดพนักงาน", "👑 โหมดเจ้าของร้าน"]), 
    handle_owner_text
)
