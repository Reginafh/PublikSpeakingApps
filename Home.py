import re
from datetime import datetime
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, StrictBool, Field, field_validator
from firebase_admin import firestore, auth

# Inisialisasi Router
router = APIRouter(prefix="/api", tags=["Home & Core Features"])


# Helper function untuk akses DB (Lazy Loading)
# Mencegah error "Firebase app does not exist" saat file ini di-import oleh Login.py
def get_db():
    return firestore.client()


# Helper validasi format & keberadaan User ID di Firebase
def verify_user_id(user_id: str, db):
    # 1. Validasi format Firebase UID (alfanumerik 20-36 karakter, menolak simbol seperti '|' atau '1')
    if not re.match(r"^[a-zA-Z0-9]{20,36}$", user_id):
        raise HTTPException(status_code=400, detail="Format user_id tidak valid.")

    # 2. Cek apakah user terdaftar di Firestore atau Firebase Auth
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        try:
            auth.get_user(user_id)
        except auth.UserNotFoundError:
            raise HTTPException(status_code=404, detail="User ID tidak ditemukan.")
        except Exception:
            raise HTTPException(status_code=404, detail="User ID tidak ditemukan.")

    return user_doc


class AISettingsModel(BaseModel):
    strictness_level: str = "medium"  # low, medium, high
    focus_area: str = "articulation"  # articulation, confidence, pace
    language: str = "id"


class BuyTokenModel(BaseModel):
    user_id: str
    package_id: str


class ProfileSettingsModel(BaseModel):
    user_id: str
    name: Optional[str] = Field(default=None, min_length=2, max_length=50)
    notifications_enabled: Optional[StrictBool] = True  # Menolak integer 1/0, wajib boolean true/false
    theme: Optional[Literal["light", "dark", "system"]] = "light"  # Hanya menerima light, dark, atau system

    @field_validator("user_id")
    @classmethod
    def validate_uid_format(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9]{20,36}$", v):
            raise ValueError("Format user_id tidak valid.")
        return v

    @field_validator("name")
    @classmethod
    def validate_name_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) < 2 or cleaned.isdigit():
                raise ValueError("Nama tidak valid atau tidak boleh hanya berupa angka.")
            return cleaned
        return v


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
        # Inisialisasi dokumen user valid yang belum punya record token di Firestore
        user_data = {
            "tokens": 5,
            "last_token_reset": today_str
        }
        user_ref.set(user_data, merge=True)
        return user_data

    data = doc.to_dict() or {}
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
    verify_user_id(user_id, db)
    user_data = get_updated_user_tokens(user_id)

    # Ambil riwayat tanpa .order_by() di Firestore agar tidak error 500 Missing Composite Index
    history_ref = db.collection("upload_history").where("user_id", "==", user_id).stream()
    all_history = [h.to_dict() for h in history_ref]

    # Urutkan terbaru di Python dan ambil 3 teratas
    all_history.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    recent_history = all_history[:3]

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
    db = get_db()
    verify_user_id(user_id, db)

    docs = db.collection("upload_history").where("user_id", "==", user_id).stream()
    history_list = [doc.to_dict() for doc in docs]
    history_list.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)

    return {
        "status": "success",
        "total": len(history_list),
        "data": history_list
    }


# 4. DETAIL ULASAN AI SPESIFIK
@router.get("/history/detail/{history_id}")
def get_history_detail(history_id: str):
    # Validasi format ID dokumen Firestore
    if not re.match(r"^[a-zA-Z0-9]{15,36}$", history_id):
        raise HTTPException(status_code=400, detail="Format history_id tidak valid.")

    db = get_db()
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
    db = get_db()
    verify_user_id(user_id, db)
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
    verify_user_id(data.user_id, db)

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
    verify_user_id(data.user_id, db)

    user_ref = db.collection("users").document(data.user_id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None and k != "user_id"}

    user_ref.set(update_data, merge=True)
    return {"status": "success", "message": "Pengaturan profil berhasil diperbarui."}