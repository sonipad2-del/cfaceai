from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes,
    MessageHandler,
    CallbackQueryHandler,
    CommandHandler,
    ConversationHandler,
    filters
)
from datetime import datetime, timezone, timedelta
import os
from services.api import check_location, verify_face, get_active_ad, log_ad_action

TZ_BANGKOK = timezone(timedelta(hours=7))
BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:8080")

WAITING_FOR_SELFIE = 1

def get_thai_day_name() -> str:
    day_idx = datetime.now(TZ_BANGKOK).weekday()
    days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
    return days[day_idx]

async def handle_location_init(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user_location = update.message.location
    chat_id = update.effective_chat.id
    
    lat = user_location.latitude
    lng = user_location.longitude
    
    # 1. Post coordinates to backend to verify distance
    result = check_location(str(chat_id), lat, lng)
    
    if not result:
        await update.message.reply_text(
            "❌ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ หรือคุณยังไม่ได้ลงทะเบียนพนักงานในระบบ กรุณากดปุ่มลิงก์แนะนำตัว /start ครับ"
        )
        return ConversationHandler.END

    # 2. Check out of bounds
    if result.get("status") == "out_of_bounds":
        distance = result.get("distance")
        await update.message.reply_text(
            f"❌ นอกพื้นที่\n"
            f"คุณอยู่ห่าง {distance} เมตร\n"
            f"กรุณาเข้ามาในพื้นที่รัศมีที่กำหนดก่อนครับ"
        )
        return ConversationHandler.END
        
    # 3. Check if Face ID is registered
    if not result.get("face_registered"):
        await update.message.reply_text(
            "❌ บัญชีของคุณยังไม่ได้ลงทะเบียนสแกนใบหน้า (Face ID)\n"
            "กรุณาพิมพ์ /start เพื่ออัปเดตรูปถ่ายใบหน้าตรงก่อนเช็กอินงานครับ"
        )
        return ConversationHandler.END
        
    # 4. Save coordinates in session and wait for selfie
    context.user_data["lat"] = lat
    context.user_data["lng"] = lng
    
    await update.message.reply_text(
        "📍 ตรวจสอบพิกัดถูกต้องอยู่ในระยะพื้นที่ทำงานเรียบร้อย!\n\n"
        "📸 ขั้นตอนสุดท้าย: กรุณาส่งรูปถ่ายใบหน้าตรง (Selfie) ปัจจุบันของคุณ 1 รูป เพื่อยืนยันตัวตนสแกน Face ID เข้างานครับ"
    )
    return WAITING_FOR_SELFIE

async def handle_selfie(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    photo_file = None
    if update.message.photo:
        photo_file = await update.message.photo[-1].get_file()
    elif update.message.document and update.message.document.mime_type and update.message.document.mime_type.startswith("image/"):
        photo_file = await update.message.document.get_file()
        
    if not photo_file:
        await update.message.reply_text("❌ กรุณาส่งรูปถ่ายเซลฟี่ใบหน้าตรงของคุณ 1 รูปครับ (หรือพิมพ์ /cancel เพื่อยกเลิก)")
        return WAITING_FOR_SELFIE
        
    chat_id = update.effective_chat.id
    lat = context.user_data.get("lat")
    lng = context.user_data.get("lng")
    
    if not lat or not lng:
        await update.message.reply_text("❌ ไม่พบข้อมูลพิกัดสถานที่ กรุณาแชร์ตำแหน่ง (Location) ใหม่อีกครั้งครับ")
        context.user_data.clear()
        return ConversationHandler.END
        
    await update.message.reply_text("⏳ กำลังประมวลผลสแกนใบหน้าเปรียบเทียบ Face ID...")
    
    try:
        photo_bytes = await photo_file.download_as_bytearray()
        
        # Verify face on backend
        result = verify_face(str(chat_id), lat, lng, bytes(photo_bytes))
        
        if result and result.get("status") == "success":
            action = result.get("action")
            employee_name = result.get("employee_name")
            check_time = result.get("time")
            distance = result.get("distance")
            match_score = result.get("match_score", 100)
            
            if action == "check_in":
                day_name = get_thai_day_name()
                msg = (
                    f"✅ สแกนใบหน้าสำเร็จ! เช็กอินเข้างานเรียบร้อย\n"
                    f"👤 พนักงาน: {employee_name}\n"
                    f"🕐 เวลา: {check_time}\n"
                    f"📍 พิกัดห่าง: {distance} เมตร\n"
                    f"🤖 Face ID Match: {match_score}%\n"
                    f"─────────────────\n"
                    f"🌞 สวัสดีตอนเช้า วัน{day_name}สดใส ขอให้สนุกกับการทำงานในวันนี้นะครับ!"
                )
            else:
                msg = (
                    f"✅ สแกนใบหน้าสำเร็จ! เช็กเอาต์ออกงานเรียบร้อย\n"
                    f"👤 พนักงาน: {employee_name}\n"
                    f"🕐 เวลา: {check_time}\n"
                    f"🤖 Face ID Match: {match_score}%\n"
                    f"─────────────────\n"
                    f"🌙 ขอบคุณสำหรับการทำงานวันนี้ เดินทางกลับบ้านปลอดภัยนะครับ! 🚗"
                )
                
            await update.message.reply_text(msg)
            
            # Display sponsor ad
            await display_sponsor_ad(update, chat_id, action)
            context.user_data.clear()
            return ConversationHandler.END
        else:
            detail = result.get("detail") if result else "สแกนใบหน้าไม่ผ่าน"
            await update.message.reply_text(
                f"❌ สแกนใบหน้าไม่สำเร็จ: {detail}\n"
                f"กรุณาส่งรูปถ่ายเซลฟี่ใบหน้าตรงใหม่อีกครั้งครับ"
            )
            return WAITING_FOR_SELFIE
    except Exception as e:
        print(f"Exception during verify_face: {e}")
        await update.message.reply_text("❌ เกิดข้อผิดพลาดในระบบสแกนใบหน้า กรุณาลองใหม่อีกครั้ง")
        return WAITING_FOR_SELFIE

async def cancel_checkin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("ยกเลิกการเช็กอินเข้างานเรียบร้อยแล้ว")
    context.user_data.clear()
    return ConversationHandler.END

async def display_sponsor_ad(update: Update, chat_id: int, action: str):
    ad = get_active_ad(str(chat_id))
    if not ad:
        return
        
    ad_id = ad.get("id")
    title = ad.get("title", "โปรโมชั่นพิเศษ")
    image_url = ad.get("image_url")
    affiliate_url = ad.get("affiliate_url", "")
    
    log_ad_action(ad_id, str(chat_id), "impression")
    
    pdpa_note = (
        "<i>การกดรับโปรโมชั่น ถือว่าคุณยอมรับ\n"
        "นโยบายความเป็นส่วนตัว (PDPA) และยินยอมให้\n"
        "Nova7 เปิดเผยข้อมูลเพื่อวัตถุประสงค์ทางการตลาด</i>"
    )
    caption = f"🎁 <b>ผู้สนับสนุนระบบ Nova7</b>\n📌 <b>{title}</b>\n\n{pdpa_note}"
    
    reply_markup = None
    if affiliate_url and affiliate_url.startswith("http"):
        # Enticing CTA button — changes based on time of day
        from datetime import datetime, timezone, timedelta
        hour = datetime.now(timezone(timedelta(hours=7))).hour
        if hour < 12:
            btn_text = "🎁 รับโปรเช้านี้เลย!"
        elif hour < 17:
            btn_text = "🛒 รับสิทธิ์เลย!"
        else:
            btn_text = "🌙 รับดีลคืนนี้!"
        
        keyboard = [[InlineKeyboardButton(btn_text, url=affiliate_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
    
    try:
        await update.message.reply_photo(
            photo=image_url,
            caption=caption,
            parse_mode="HTML",
            reply_markup=reply_markup
        )
    except Exception as e:
        print(f"Error sending ad photo: {e}")
        try:
            await update.message.reply_text(
                text=caption,
                parse_mode="HTML",
                reply_markup=reply_markup
            )
        except Exception as e2:
            print(f"Error sending ad text fallback: {e2}")





async def close_ad(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    try:
        await query.delete_message()
    except Exception as e:
        print(f"Error deleting ad message: {e}")

async def unmatched_photo_handler_func(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "❌ กรุณาส่งตำแหน่ง (Location) ของคุณก่อนครับ\n"
        "จากนั้นค่อยส่งรูปเซลฟี่ตามมาเพื่อเช็กอิน/เช็กเอาต์"
    )

# Export location check-in conversation handler
location_handler = ConversationHandler(
    entry_points=[MessageHandler(filters.LOCATION, handle_location_init)],
    states={
        WAITING_FOR_SELFIE: [MessageHandler((filters.PHOTO | filters.Document.ALL) & ~filters.COMMAND, handle_selfie)],
    },
    fallbacks=[CommandHandler("cancel", cancel_checkin)],
)
close_ad_handler = CallbackQueryHandler(close_ad, pattern="^close_ad$")
unmatched_photo_handler = MessageHandler((filters.PHOTO | filters.Document.ALL) & ~filters.COMMAND, unmatched_photo_handler_func)

