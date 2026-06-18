import os
import logging
from dotenv import load_dotenv
from telegram.ext import ApplicationBuilder

# Import handlers
from handlers.start import registration_conv
from handlers.location import location_handler, close_ad_handler, unmatched_photo_handler
from handlers.owner import owner_text_handler
from handlers.announce import announce_conv, read_announce_handler
from handlers.leave import leave_conv, leave_approval_handler
from handlers.history import history_handler
from handlers.menu import menu_handler
from handlers.salary import salary_handler, unknown_handler

load_dotenv()

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token or token == "789012345:AAH_mock_token_for_telegram_bot_abcde":
        logger.warning("Bot is running with a placeholder/mock token. Configure your real token in telegram-bot/.env")
        
    app = ApplicationBuilder().token(token).build()
    
    # Add handlers (order matters — specific first, fallback last)
    app.add_handler(registration_conv)
    app.add_handler(location_handler)
    app.add_handler(close_ad_handler)
    app.add_handler(owner_text_handler)
    app.add_handler(announce_conv)
    app.add_handler(read_announce_handler)
    app.add_handler(leave_conv)
    app.add_handler(leave_approval_handler)
    app.add_handler(history_handler)
    app.add_handler(salary_handler)
    app.add_handler(menu_handler)
    
    # Fallback photo handler (must be after location_handler)
    app.add_handler(unmatched_photo_handler)
    
    # Unknown text fallback — MUST be last
    app.add_handler(unknown_handler)
    
    logger.info("Nova7 Telegram Bot has been initialized. Running polling...")
    app.run_polling()

if __name__ == "__main__":
    main()
