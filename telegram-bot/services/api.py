import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")

def get_company_by_code(join_code: str):
    try:
        resp = requests.get(f"{API_URL}/companies/by-code/{join_code}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching company by code: {e}")
    return None

def register_employee(chat_id: str, full_name: str, join_code: str):
    try:
        payload = {
            "chat_id": str(chat_id),
            "full_name": full_name,
            "join_code": join_code
        }
        resp = requests.post(f"{API_URL}/employees/register", json=payload, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error registering employee: {e}")
    return None

def record_checkin(chat_id: str, lat: float, lng: float):
    try:
        payload = {
            "chat_id": str(chat_id),
            "lat": lat,
            "lng": lng
        }
        resp = requests.post(f"{API_URL}/checkins", json=payload, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error recording check-in: {e}")
    return None

def get_active_ad(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/ads/active", params={"chat_id": str(chat_id)}, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching active ad: {e}")
    return None

def log_ad_action(ad_id: str, chat_id: str, action_type: str):
    try:
        payload = {
            "ad_id": ad_id,
            "chat_id": str(chat_id),
            "action_type": action_type
        }
        requests.post(f"{API_URL}/ads/log", json=payload, timeout=5)
    except Exception as e:
        print(f"Error logging ad action: {e}")

def get_bot_report(owner_chat_id: str, report_type: str):
    try:
        resp = requests.get(f"{API_URL}/checkins/bot/report", params={
            "owner_chat_id": str(owner_chat_id),
            "report_type": report_type
        }, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error getting bot report: {e}")
    return None

def get_bot_employee_list(owner_chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/employees/bot/list", params={
            "owner_chat_id": str(owner_chat_id)
        }, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error getting bot employee list: {e}")
    return None

def register_face(chat_id: str, photo_bytes: bytes):
    try:
        files = {"file": ("face.jpg", photo_bytes, "image/jpeg")}
        resp = requests.post(f"{API_URL}/employees/register-face", params={"chat_id": chat_id}, files=files, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        return {"status": "error", "detail": resp.json().get("detail", "Error registering face")}
    except Exception as e:
        print(f"Error registering face exception: {e}")
    return None

def check_location(chat_id: str, lat: float, lng: float):
    try:
        payload = {
            "chat_id": str(chat_id),
            "lat": lat,
            "lng": lng
        }
        resp = requests.post(f"{API_URL}/checkins/check-location", json=payload, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error checking location: {e}")
    return None

def verify_face(chat_id: str, lat: float, lng: float, photo_bytes: bytes, action: str = None):
    try:
        files = {"file": ("selfie.jpg", photo_bytes, "image/jpeg")}
        params = {
            "chat_id": str(chat_id),
            "lat": lat,
            "lng": lng
        }
        if action:
            params["action"] = action
        resp = requests.post(f"{API_URL}/checkins/verify-face", params=params, files=files, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        # Safely parse error response
        try:
            detail = resp.json().get("detail", f"Error {resp.status_code}")
        except Exception:
            detail = f"HTTP Error {resp.status_code}"
        return {"status": "error", "detail": detail}
    except Exception as e:
        print(f"Error verifying face exception: {e}")
    return None

def get_bot_salary(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/employees/bot/salary", params={"chat_id": str(chat_id)}, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching salary: {e}")
    return None

def get_user_role(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/bot/user/{chat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching user role: {e}")
    return None

def link_owner(chat_id: str, token: str):
    try:
        payload = {"chat_id": str(chat_id), "token": token}
        resp = requests.post(f"{API_URL}/bot/link_owner", json=payload, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error linking owner: {e}")
    return None

def get_owner_dashboard(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/bot/owner/dashboard/{chat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching owner dashboard: {e}")
    return None

def get_pending_leaves(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/bot/owner/pending_leaves/{chat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching pending leaves: {e}")
    return []
def create_announcement(chat_id: str, message: str):
    try:
        payload = {"chat_id": str(chat_id), "message": message}
        resp = requests.post(f"{API_URL}/bot/owner/announcements", json=payload, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error creating announcement: {e}")
    return None

def mark_announcement_read(chat_id: str, announcement_id: str):
    try:
        resp = requests.put(f"{API_URL}/bot/announcements/{announcement_id}/read/{chat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error marking announcement read: {e}")
    return None

def get_owner_promotions(chat_id: str):
    try:
        resp = requests.get(f"{API_URL}/bot/owner/promotions/{chat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching owner promotions: {e}")
    return []
