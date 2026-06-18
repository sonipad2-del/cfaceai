import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    filters
)
from services.api import get_company_by_code, register_employee, register_face, link_owner, get_user_role
from handlers.menu import get_main_menu_keyboard
from handlers.owner import get_owner_menu_keyboard, get_superadmin_menu_keyboard, show_owner_dashboard

WAITING_FOR_TERMS = 0
WAITING_FOR_NAME = 1
WAITING_FOR_PHOTO = 2

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    args = context.args
    chat_id = str(update.effective_chat.id)
    print(f"Start handler triggered! args={args}", flush=True)
    
    if args and args[0].startswith("linkowner_"):
        token = args[0]
        result = link_owner(chat_id, token)
        if result and result.get("status") == "success":
            await update.message.reply_text("✅ เชื่อมต่อบัญชีเจ้าของร้านสำเร็จ!")
            await show_owner_dashboard(update, context)
        else:
            await update.message.reply_text("❌ ลิงก์เชื่อมต่อไม่ถูกต้อง หรือหมดอายุแล้ว")
        return ConversationHandler.END

    if not args or not args[0].startswith("join_"):
        # Check Role
        user_info = get_user_role(chat_id)
        if user_info:
            role = user_info.get("role")
            if role == "superadmin":
                await update.message.reply_text(
                    "👑 ยินดีต้อนรับ Super Admin\nเลือกระบบจัดการด้านล่าง:",
                    reply_markup=get_superadmin_menu_keyboard()
                )
            elif role == "owner":
                await show_owner_dashboard(update, context)
            else:
                await update.message.reply_text(
                    "👋 ยินดีต้อนรับสู่ระบบ Nova7\n"
                    "👇 เลือกเมนูด้านล่างเพื่อทำรายการ หรือใช้ /menu เพื่อเปิดเมนูอีกครั้ง",
                    reply_markup=get_main_menu_keyboard()
                )
        else:
            await update.message.reply_text(
                "👋 ยินดีต้อนรับสู่ระบบ Nova7\n"
                "คุณยังไม่ได้ลงทะเบียนในระบบ กรุณาสแกน QR Code เพื่อเข้าร่วมบริษัท"
            )
        return ConversationHandler.END
        
    join_code = args[0].replace("join_", "")
    # Check join code
    company = get_company_by_code(join_code)
    
    if not company:
        await update.message.reply_text(
            "❌ รหัสเข้าร่วมไม่ถูกต้อง หรือไม่มีบริษัทนี้อยู่ในระบบ"
        )
        return ConversationHandler.END
        
    # Save join code to session
    context.user_data["join_code"] = join_code
    context.user_data["company_name"] = company["name"]
    
    # Show Terms of Service first!
    keyboard = [[InlineKeyboardButton("✅ ยอมรับและเริ่มใช้งาน", callback_data="accept_terms")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "📋 *ข้อตกลงการใช้งานระบบ Nova7*\n\n"
        "ระบบนี้ใช้สำหรับบันทึกเวลาทำงาน ตรวจสอบการเข้างาน และการสื่อสารภายในองค์กร\n\n"
        "การใช้งานระบบอาจมีการจัดเก็บข้อมูลที่เกี่ยวข้องกับการทำงาน เช่น ชื่อผู้ใช้งาน รูปภาพสำหรับยืนยันตัวตน ข้อมูลตำแหน่งที่ตั้ง (GPS) ในขณะที่ทำการบันทึกเวลาทำงาน และประวัติการลางาน\n\n"
        "ข้อมูลเหล่านี้จะถูกเก็บรักษาเป็นความลับและใช้งานเพื่อวัตถุประสงค์ในการบริหารงานบุคคลและการตรวจสอบภายในบริษัทของคุณเท่านั้น\n\n"
        "ระบบอาจแสดงข้อมูล ข่าวสาร ข้อเสนอพิเศษ หรือโปรโมชั่นภายในระบบเป็นครั้งคราว\n\n"
        f"อ่าน [ข้อตกลงในการให้บริการ]({os.getenv('FRONTEND_URL', 'http://localhost:5173')}/terms) และ [นโยบายความเป็นส่วนบุคคล]({os.getenv('FRONTEND_URL', 'http://localhost:5173')}/privacy) ฉบับเต็ม\n\n"
        "โดยการคลิกปุ่มด้านล่างนี้ ถือว่าคุณได้อ่าน เข้าใจ และยอมรับข้อตกลงทั้งหมด",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )
    return WAITING_FOR_TERMS

async def accept_terms(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    
    # Save acceptance status in context
    context.user_data["terms_accepted"] = True
    
    company_name = context.user_data.get("company_name", "บริษัท")
    
    # Modify message to show accepted and request full name
    await query.edit_message_text(
        f"✅ ยอมรับข้อตกลงการใช้งานเรียบร้อยแล้ว\n\n"
        f"🏢 ยินดีต้อนรับเข้าสู่บริษัท *{company_name}*\n"
        "กรุณาพิมพ์ *ชื่อ-นามสกุล* ของคุณเพื่อลงทะเบียนเข้าสู่ระบบ:",
        parse_mode="Markdown"
    )
    return WAITING_FOR_NAME

async def save_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    full_name = update.message.text.strip()
    join_code = context.user_data.get("join_code")
    company_name = context.user_data.get("company_name")
    
    if not join_code:
        await update.message.reply_text("เกิดข้อผิดพลาด กรุณากดลิงก์ลงทะเบียนใหม่อีกครั้งครับ")
        return ConversationHandler.END
        
    chat_id = update.effective_chat.id
    
    # Call backend to register employee
    emp = register_employee(str(chat_id), full_name, join_code)
    
    if emp:
        context.user_data["full_name"] = full_name
        await update.message.reply_text(
            f"👤 บันทึกข้อมูลพนักงานเบื้องต้นสำเร็จ!\n"
            f"ชื่อ: {full_name}\n"
            f"บริษัท: {company_name}\n\n"
            f"📸 ขั้นตอนสุดท้าย: กรุณาส่งรูปถ่ายใบหน้า (หน้าตรงชัดเจน) ของคุณ 1 รูป เพื่อบันทึกข้อมูลสแกนใบหน้า (Face ID) เข้างานครับ"
        )
        return WAITING_FOR_PHOTO
    else:
        await update.message.reply_text(
            "❌ ไม่สามารถลงทะเบียนได้ กรุณาติดต่อฝ่ายบุคคลหรือบริษัทของคุณเพื่อขอข้อมูลรหัสเชื่อมต่อใหม่"
        )
        context.user_data.clear()
        return ConversationHandler.END

async def save_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    photo_file = None
    if update.message.photo:
        photo_file = await update.message.photo[-1].get_file()
    elif update.message.document and update.message.document.mime_type and update.message.document.mime_type.startswith("image/"):
        photo_file = await update.message.document.get_file()
        
    if not photo_file:
        await update.message.reply_text("❌ กรุณาส่งไฟล์รูปถ่ายใบหน้าตรงของคุณ 1 รูปครับ")
        return WAITING_FOR_PHOTO
        
    chat_id = update.effective_chat.id
    full_name = context.user_data.get("full_name")
    company_name = context.user_data.get("company_name")
    
    await update.message.reply_text("⏳ กำลังตรวจสอบใบหน้าและบันทึกข้อมูล Face ID...")
    
    try:
        photo_bytes = await photo_file.download_as_bytearray()
        result = register_face(str(chat_id), bytes(photo_bytes))
        
        if result and result.get("status") == "success":
            await update.message.reply_text(
                f"✅ ลงทะเบียน Face ID และพนักงานสำเร็จเรียบร้อย!\n"
                f"👤 ชื่อ: {full_name}\n"
                f"🏢 บริษัท: {company_name}\n\n"
                f"คุณสามารถเช็กอิน/เช็กเอาต์ทำงานได้ทันที โดยใช้ปุ่มเมนูด้านล่างครับ",
                reply_markup=get_main_menu_keyboard()
            )
            context.user_data.clear()
            return ConversationHandler.END
        else:
            detail = result.get("detail") if result else "ไม่สามารถประมวลผลรูปภาพได้"
            await update.message.reply_text(
                f"❌ ลงทะเบียน Face ID ไม่สำเร็จ: {detail}\n"
                f"กรุณาส่งรูปถ่ายใบหน้าตรงใหม่อีกครั้งครับ (ตรวจสอบแสงสว่างและใบหน้าให้ตรงชัดเจน)"
            )
            return WAITING_FOR_PHOTO
    except Exception as e:
        print(f"Exception during register_face: {e}")
        await update.message.reply_text("❌ เกิดข้อผิดพลาดในระบบลงทะเบียนใบหน้า กรุณาลองใหม่อีกครั้ง")
        return WAITING_FOR_PHOTO

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("ยกเลิกการลงทะเบียนพนักงานเรียบร้อยแล้ว", reply_markup=get_main_menu_keyboard())
    context.user_data.clear()
    return ConversationHandler.END

# Export conversation handler
registration_conv = ConversationHandler(
    entry_points=[CommandHandler("start", start)],
    states={
        WAITING_FOR_TERMS: [CallbackQueryHandler(accept_terms, pattern="^accept_terms$")],
        WAITING_FOR_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_name)],
        WAITING_FOR_PHOTO: [MessageHandler((filters.PHOTO | filters.Document.ALL) & ~filters.COMMAND, save_photo)],
    },
    fallbacks=[CommandHandler("cancel", cancel)],
)
