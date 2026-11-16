import os
import random
import uvicorn
import smtplib
import requests
import firebase_admin
from datetime import datetime, timedelta, timezone
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Memuat variabel lingkungan
load_dotenv()

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

# Inisialisasi Firebase Admin SDK
cred = credentials.Certificate("ServiceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI(title="SpeakUp Backend API")

# Integrasi Frontend: Middleware CORS (Membuka akses untuk Frontend Mobile/Web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from Home import router as home_router
from Upload import router as upload_router
app.include_router(home_router)
app.include_router(upload_router)

@app.get("/")
def read_root():
    return {"message": "Server FastAPI SpeakUp Berhasil Berjalan!"}


class RegisterModel(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email', 'password')
    @classmethod
    def check_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Email dan password tidak boleh kosong atau hanya berisi spasi.")
        return v

    # BUG 4 FIX: Validasi panjang password minimal 6 karakter di Pydantic
    @field_validator('password')
    @classmethod
    def check_password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password minimal terdiri dari 6 karakter.")
        return v


class LoginWithPasswordModel(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email', 'password')
    @classmethod
    def check_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Email dan password tidak boleh kosong atau hanya berisi spasi.")
        return v


class VerifyOTPModel(BaseModel):
    email: EmailStr
    otp_code: str

    @field_validator('otp_code')
    @classmethod
    def check_otp_format(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Kode OTP tidak boleh kosong.")
        if not v.isdigit():
            raise ValueError("Format OTP harus berupa angka")
        return v


class ResendOTPModel(BaseModel):
    email: EmailStr


class ResetPasswordModel(BaseModel):
    email: EmailStr


class GoogleLoginModel(BaseModel):
    id_token: str


def send_otp_via_email(target_email: str, otp_code: str):
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        raise HTTPException(
            status_code=500, 
            detail="Konfigurasi email pengirim belum diatur di file .env"
        )

    subject = "Kode OTP Verifikasi - SpeakUp"
    body = f"""Halo,

Berikut adalah kode OTP verifikasi akun SpeakUp kamu:
{otp_code}

Kode ini berlaku selama 5 menit. Mohon tidak membagikan kode ini kepada siapapun.

Salam hangat,
Tim SpeakUp
"""

    msg = MIMEText(body, 'plain')
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = target_email

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, target_email, msg.as_string())


def send_reset_password_email(target_email: str, reset_link: str):
    """Pengiriman link reset password via SMTP"""
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        raise HTTPException(
            status_code=500, 
            detail="Konfigurasi email pengirim belum diatur di file .env"
        )

    subject = "Reset Password - SpeakUp"
    body = f"""Halo,

Kami menerima permintaan untuk meriset password akun SpeakUp kamu.

Silakan klik tautan di bawah ini untuk meriset password kamu:
{reset_link}

Jika kamu tidak meminta reset password, silakan abaikan email ini.

Salam hangat,
Tim SpeakUp
"""

    msg = MIMEText(body, 'plain')
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = target_email

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, target_email, msg.as_string())


def generate_and_save_otp(email: str):
    """
    Membuat OTP acak dan menyimpannya menggunakan Native Firestore Timestamp (BUG 3 NATIVE TIMESTAMP FIX)
    """
    generated_otp = str(random.randint(100000, 999999))
    now = datetime.now(timezone.utc)
    expiration_time = now + timedelta(minutes=5)

    doc_ref = db.collection("otp_requests").document(email)
    
    # Firestore menyimpan objek datetime Python sebagai Native Timestamp secara otomatis
    doc_ref.set({
        "otp_code": generated_otp,
        "expires_at": expiration_time,
        "created_at": now,
        "is_used": False
    })

    send_otp_via_email(email, generated_otp)

# 1. REGISTRATION (BUG 4 FIX)
@app.post("/auth/register")
def register(data: RegisterModel):
    created_user = None
    email_clean = data.email.strip().lower()
    
    try:
        created_user = auth.create_user(
            email=email_clean,
            password=data.password,
            email_verified=False
        )
        
        generate_and_save_otp(email_clean)
        
        return {
            "status": "success",
            "message": f"Akun {email_clean} berhasil dibuat. Kode OTP telah dikirim ke email kamu."
        }
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email ini sudah terdaftar. Silakan lakukan Login.")
    except auth.WeakPasswordError:
        raise HTTPException(status_code=400, detail="Password terlalu lemah. Minimal terdiri dari 6 karakter.")
    except (auth.InvalidEmailError, auth.InvalidArgumentError, ValueError) as e:
        if created_user:
            try:
                auth.delete_user(created_user.uid)
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"Format input tidak valid: {str(e)}")
    except Exception as e:
        if created_user:
            try:
                auth.delete_user(created_user.uid)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Gagal melakukan registrasi: {str(e)}")


# 2. LOGIN
@app.post("/auth/login")
def login_with_password(data: LoginWithPasswordModel):
    if not FIREBASE_API_KEY:
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY belum diatur di file .env")

    endpoint_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": data.email.strip().lower(),
        "password": data.password,
        "returnSecureToken": True
    }

    response = requests.post(endpoint_url, json=payload)
    res_data = response.json()
    
    if response.status_code != 200:
        error_msg = res_data.get("error", {}).get("message", "")
        if "INVALID_EMAIL" in error_msg or "MISSING_PASSWORD" in error_msg:
            raise HTTPException(status_code=400, detail="Format email atau password tidak valid.")
        elif "EMAIL_NOT_FOUND" in error_msg or "INVALID_PASSWORD" in error_msg:
            raise HTTPException(status_code=401, detail="Email atau password yang kamu masukkan salah.")
        else:
            raise HTTPException(status_code=400, detail="Gagal melakukan login. Periksa kembali input kamu.")

    uid = res_data.get("localId")
    custom_token = auth.create_custom_token(uid)
    token_str = custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token

    return {
        "status": "success",
        "message": "Login berhasil!",
        "token": token_str,
        "idToken": res_data.get("idToken"),
        "refreshToken": res_data.get("refreshToken")
    }


# 3. VERIFY OTP
@app.post("/auth/verify-otp")
def verify_otp(data: VerifyOTPModel):
    email_clean = data.email.strip().lower()
    doc_ref = db.collection("otp_requests").document(email_clean)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Email belum meminta kode OTP")

    otp_data = doc.to_dict()

    if otp_data.get("is_used"):
        raise HTTPException(status_code=400, detail="Kode OTP sudah pernah digunakan")

    expires_at = otp_data.get("expires_at")
    now = datetime.now(timezone.utc)
    
    # Pengecekan aman untuk tipe datetime
    if expires_at and isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(status_code=400, detail="Kode OTP telah kadaluwarsa")

    if str(otp_data.get("otp_code")) != str(data.otp_code):
        raise HTTPException(status_code=400, detail="Kode OTP salah")

    # Tandai OTP terpakai
    doc_ref.update({"is_used": True})

    try:
        user = auth.get_user_by_email(email_clean)
        # Update email_verified ke True di Firebase Auth
        auth.update_user(user.uid, email_verified=True)
        
        custom_token = auth.create_custom_token(user.uid)
        token_str = custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token
    except Exception:
        token_str = None

    return {
        "status": "success",
        "message": "Verifikasi OTP berhasil. Akun kamu telah aktif!",
        "token": token_str
    }


# 4. RESEND OTP
@app.post("/auth/resend-otp")
def resend_otp(data: ResendOTPModel):
    email_clean = data.email.strip().lower()

    # Validasi keberadaan user dan status verifikasi
    try:
        user = auth.get_user_by_email(email_clean)
        if user.email_verified:
            raise HTTPException(status_code=400, detail="Akun sudah terverifikasi.")
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memeriksa status akun: {str(e)}")

    doc_ref = db.collection("otp_requests").document(email_clean)
    doc = doc_ref.get()

    if doc.exists:
        otp_data = doc.to_dict()
        last_created_at = otp_data.get("created_at")
        
        # Pengecekan aman tipe datetime (mencegah crash jika ada data float lama)
        if last_created_at and isinstance(last_created_at, datetime):
            if last_created_at.tzinfo is None:
                last_created_at = last_created_at.replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            time_elapsed = (now - last_created_at).total_seconds()
            
            if time_elapsed < 60:
                remaining = int(60 - time_elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Mohon tunggu {remaining} detik sebelum meminta kode OTP baru."
                )

    try:
        generate_and_save_otp(email_clean)
        return {
            "status": "success",
            "message": "Kode OTP baru berhasil dikirim ke email kamu."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengirim ulang OTP: {str(e)}")


# 5. RESET PASSWORD (BUG 1 & BUG 2 FIX)
@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordModel):
    email_clean = data.email.strip().lower()
    
    try:
        # Tangani email yang tidak terdaftar dengan 404 Not Found
        auth.get_user_by_email(email_clean)

        # Generate link resmi dari Firebase Auth
        reset_link = auth.generate_password_reset_link(email_clean)

        # Kirim link melalui email
        send_reset_password_email(email_clean, reset_link)

        # Menghapus 'reset_link' dari payload JSON respons
        return {
            "status": "success",
            "message": f"Link reset password berhasil dikirim ke email {email_clean}."
        }
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar di sistem.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses reset password: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("Login:app", host="127.0.0.1", port=8000, reload=True)