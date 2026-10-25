import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from firebase_admin import firestore

# Inisialisasi Firestore DB
db = firestore.client()      

# Inisialisasi Router
router = APIRouter(prefix="/api", tags=["Home & Core Features"])

# Helper function untuk dipanggil saat butuh akses DB (Lazy Loading)
# Ini mencegah error "Firebase app does not exist" saat file ini di-import oleh Login.py
def get_db():
    return firestore.client()

class AISettingsModel(BaseModel):
    strictness_level: str = "medium"  # low, medium, high
    focus_area: str = "articulation"  # articulation, confidence, pace
    language: str = "id"

class BuyTokenModel(BaseModel):
    user_id: str
    package_id: str

class ProfileSettingsModel(BaseModel):
    user_id: str
    name: Optional[str] = None
    notifications_enabled: Optional[bool] = True
    theme: Optional[str] = "light"

def get_updated_user_tokens(user_id: str) -> dict:
    """
    Mengecek dan memperbarui token pengguna.
    Jika hari berganti (00:00) dan token < 5, token di-reset ke 5.
    Jika token >= 5, jumlah token tidak berubah.
    """
    db = get_db()
    user_ref = db.collection("users").document(user_id)
    doc = user_ref.get()

    today_str = datetime.now().strftime("%Y-%m-%d")

    if not doc.exists:
        # Default user baru
        user_data = {
            "tokens": 5,
            "last_token_reset": today_str
        }
        user_ref.set(user_data, merge=True)
        return user_data

    data = doc.to_dict()
    current_tokens = data.get("tokens", 5)
    last_reset = data.get("last_token_reset", "")

    # Cek apakah sudah berganti hari (00:00)
    if last_reset != today_str:
        if current_tokens < 5:
            current_tokens = 5
        
        data["tokens"] = current_tokens
        data["last_token_reset"] = today_str
        user_ref.update({
            "tokens": current_tokens,
            "last_token_reset": today_str
        })

    return data

# 1. SUMMARY HOMEPAGE
@router.get("/home/summary/{user_id}")
def get_home_summary(user_id: str):
    db = get_db()
    user_data = get_updated_user_tokens(user_id)
    
    # Ambil 3 history upload terakhir untuk ringkasan di Home
    history_ref = db.collection("upload_history")\
                    .where("user_id", "==", user_id)\
                    .order_by("created_at", direction=firestore.Query.DESCENDING)\
                    .limit(3)\
                    .stream()
    
    recent_history = [h.to_dict() for h in history_ref]

    # Event/Diskon Toko
    store_events = [
        {
            "event_id": "promo_1",
            "title": "Diskon Token Spesial!",
            "description": "Dapatkan diskon 20% untuk paket 50 Token.",
            "discount_percent": 20
        }
    ]

    return {
        "status": "success",
        "tokens": user_data.get("tokens", 5),
        "recent_history": recent_history,
        "store_events": store_events
    }


# 3. SEMUA HISTORY UPLOAD
@router.get("/history/all/{user_id}")
def get_all_history(user_id: str):
    docs = db.collection("upload_history").where("user_id", "==", user_id).stream()
    
    history_list = []
    for doc in docs:
        history_list.append(doc.to_dict())

    return {
        "status": "success",
        "total": len(history_list),
        "data": history_list
    }

# 4. DETAIL ULASAN AI SPESIFIK
@router.get("/history/detail/{history_id}")
def get_history_detail(history_id: str):
    doc_ref = db.collection("upload_history").document(history_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Riwayat tidak ditemukan")

    return {
        "status": "success",
        "data": doc.to_dict()
    }

# 5. TOKO TOKEN & INFO REFRESH
@router.get("/store/info/{user_id}")
def get_store_info(user_id: str):
    user_data = get_updated_user_tokens(user_id)
    
    # Hitung detik tersisa menuju jam 00:00
    now = datetime.now()
    seconds_until_midnight = ((24 - now.hour - 1) * 3600) + ((60 - now.minute - 1) * 60) + (60 - now.second)

    token_packages = [
        {"package_id": "pkg_10", "tokens": 10, "price_idr": 15000},
        {"package_id": "pkg_50", "tokens": 50, "price_idr": 65000},
        {"package_id": "pkg_100", "tokens": 100, "price_idr": 120000}
    ]

    return {
        "status": "success",
        "current_tokens": user_data.get("tokens", 5),
        "seconds_until_refresh": seconds_until_midnight,
        "refresh_rule": "Jika token < 5 akan di-reset ke 5 pada jam 00:00. Jika >= 5 tidak berubah.",
        "packages": token_packages
    }

# 6. BELI TOKEN
@router.post("/store/buy")
def buy_token(data: BuyTokenModel):
    db = get_db()
    packages = {"pkg_10": 10, "pkg_50": 50, "pkg_100": 100}
    added_tokens = packages.get(data.package_id)
    
    if not added_tokens:
        raise HTTPException(status_code=400, detail="Paket token tidak valid.")

    user_ref = db.collection("users").document(data.user_id)
    doc = user_ref.get()
    current_tokens = doc.to_dict().get("tokens", 5) if doc.exists else 5

    new_total = current_tokens + added_tokens
    user_ref.set({"tokens": new_total}, merge=True)

    return {
        "status": "success",
        "message": f"Berhasil membeli {added_tokens} token.",
        "new_token_balance": new_total
    }

# 7. PROFIL & UBAH SETTING
@router.put("/profile/settings")
def update_profile_settings(data: ProfileSettingsModel):
    db = get_db()
    user_ref = db.collection("users").document(data.user_id)
    update_data = {k: v for k, v in data.dict().items() if v is not None and k != "user_id"}
    
    user_ref.set(update_data, merge=True)
    return {"status": "success", "message": "Pengaturan profil berhasil diperbarui."}