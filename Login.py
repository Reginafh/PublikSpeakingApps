import os
import random
import time
import uvicorn
import smtplib
import requests
import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Memuat variabel lingkungan dari file .env
load_dotenv()

# Mengambil kredensial dari variabel lingkungan (.env)
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

# Inisialisasi Firebase Admin SDK
cred = credentials.Certificate("ServiceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI(title="SpeakUp Backend API")

@app.get("/")
def read_root():
    return {"message": "Server FastAPI SpeakUp Berhasil Berjalan!"}


# ============================================================
# SKEMA DATA (PYDANTIC MODELS WITH VALIDATION)
# ============================================================

class RegisterModel(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email', 'password')
    @classmethod
    def check_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Email dan password tidak boleh kosong atau hanya berisi spasi.")
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


# ============================================================
# FUNGSI PEMBANTU (HELPER FUNCTIONS)
# ============================================================

def send_otp_via_email(target_email: str, otp_code: str):
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        raise HTTPException(
            status_code=500, 
            detail="Konfigurasi email pengirim belum diatur di file .env"
        )

    subject = "Kode OTP Verifikasi - SpeakUp"
    body = f"""Halo,

Terima kasih telah mendaftar di SpeakUp!

Berikut adalah kode OTP verifikasi akun kamu:
{otp_code}

Kode ini berlaku selama 5 menit. Mohon untuk tidak membagikan kode ini kepada siapa pun demi keamanan akun kamu.

Jika kamu tidak merasa melakukan pendaftaran ini, abaikan email ini.

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


def send_reset_link_via_email(target_email: str, reset_link: str):
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        raise HTTPException(
            status_code=500, 
            detail="Konfigurasi email pengirim belum diatur di file .env"
        )

    subject = "Reset Password - SpeakUp"
    body = f"""Halo,

Kami menerima permintaan untuk mereset kata sandi akun SpeakUp kamu.

Klik tautan di bawah ini untuk mereset kata sandi kamu:
{reset_link}

Tautan ini hanya berlaku untuk waktu terbatas. Jika kamu tidak merasa meminta reset password, abaikan email ini.

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
    """Membuat OTP acak, menyimpan ke Firestore, dan mengirim via email"""
    generated_otp = str(random.randint(100000, 999999))
    current_time = time.time()
    expiration_time = current_time + (5 * 60)

    doc_ref = db.collection("otp_requests").document(email)
    doc_ref.set({
        "otp_code": generated_otp,
        "expires_at": expiration_time,
        "created_at": current_time,
        "is_used": False
    })

    send_otp_via_email(email, generated_otp)


# ============================================================
# ENDPOINTS AUTENTIKASI
# ============================================================

# 1. SIGN-UP (PENDAFTARAN AKUN BARU + KIRIM OTP + ROLLBACK + FIXED 400/422)
@app.post("/auth/register")
def register(data: RegisterModel):
    created_user = None
    email_clean = data.email.strip().lower()
    
    try:
        # Step 1: Buat pengguna baru di Firebase Auth
        created_user = auth.create_user(
            email=email_clean,
            password=data.password
        )
        
        # Step 2: Kirim OTP untuk verifikasi pendaftaran
        generate_and_save_otp(email_clean)
        
        return {
            "status": "success",
            "message": f"Akun {email_clean} berhasil dibuat. Kode OTP telah dikirim ke email kamu."
        }
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email ini sudah terdaftar. Silakan lakukan Login.")
    except (auth.InvalidEmailError, auth.InvalidArgumentError, ValueError) as e:
        # Rollback jika ada error pada argument/email
        if created_user:
            try:
                auth.delete_user(created_user.uid)
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"Format input tidak valid: {str(e)}")
    except Exception as e:
        # ROLLBACK: Jika pengiriman OTP gagal, hapus akun yang terlanjur dibuat
        if created_user:
            try:
                auth.delete_user(created_user.uid)
            except Exception:
                pass
                
        raise HTTPException(status_code=500, detail=f"Gagal melakukan registrasi: {str(e)}")


# 2. SIGN-IN (LOGIN EMAIL + PASSWORD -> FIXED 400/401 ON CLIENT ERRORS)
@app.post("/auth/login")
def login_with_password(data: LoginWithPasswordModel):
    if not FIREBASE_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="FIREBASE_API_KEY belum diatur di file .env"
        )

    endpoint_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": data.email.strip().lower(),
        "password": data.password,
        "returnSecureToken": True
    }

    response = requests.post(endpoint_url, json=payload)
    res_data = response.json()
    
    # Penanganan spesifik error dari Firebase REST API
    if response.status_code != 200:
        error_msg = res_data.get("error", {}).get("message", "")
        if "INVALID_EMAIL" in error_msg or "MISSING_PASSWORD" in error_msg:
            raise HTTPException(status_code=400, detail="Format email atau password tidak valid.")
        elif "EMAIL_NOT_FOUND" in error_msg or "INVALID_PASSWORD" in error_msg:
            raise HTTPException(status_code=401, detail="Email atau password yang kamu masukkan salah.")
        else:
            raise HTTPException(status_code=400, detail="Gagal melakukan login. Periksa kembali input kamu.")

    # Ambil UID dan terbitkan custom_token
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


# 3. VERIFIKASI OTP REGISTRASI (FIXED SPECIFIC ERROR MESSAGES FOR BUG REPORT 3)
@app.post("/auth/verify-otp")
def verify_otp(data: VerifyOTPModel):
    email_clean = data.email.strip().lower()
    doc_ref = db.collection("otp_requests").document(email_clean)
    doc = doc_ref.get()

    # 1. Cek apakah dokumen email ada di Firestore
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Email belum meminta kode OTP")

    otp_data = doc.to_dict()

    # 2. Cek apakah OTP sudah pernah digunakan
    if otp_data.get("is_used"):
        raise HTTPException(status_code=400, detail="Kode OTP sudah pernah digunakan")

    # 3. Cek apakah OTP sudah kadaluwarsa
    if time.time() > otp_data.get("expires_at", 0):
        raise HTTPException(status_code=400, detail="Kode OTP telah kadaluwarsa")

    # 4. Cek apakah kode OTP cocok
    if str(otp_data.get("otp_code")) != str(data.otp_code):
        raise HTTPException(status_code=400, detail="Kode OTP salah")

    # Tandai OTP sudah digunakan
    doc_ref.update({"is_used": True})

    # Dapatkan User Token
    try:
        user = auth.get_user_by_email(email_clean)
        custom_token = auth.create_custom_token(user.uid)
        token_str = custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token
    except Exception:
        token_str = None

    return {
        "status": "success",
        "message": "Verifikasi OTP berhasil. Akun kamu telah aktif!",
        "token": token_str
    }


# 4. RESEND OTP (COOLDOWN 1 MENIT / 60 DETIK)
@app.post("/auth/resend-otp")
def resend_otp(data: ResendOTPModel):
    email_clean = data.email.strip().lower()
    doc_ref = db.collection("otp_requests").document(email_clean)
    doc = doc_ref.get()

    if doc.exists:
        otp_data = doc.to_dict()
        last_created_at = otp_data.get("created_at", 0)
        time_elapsed = time.time() - last_created_at
        
        # Batasan Cooldown 60 detik (1 menit)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengirim ulang OTP: {str(e)}")


# 5. RESET PASSWORD (ENDPOINT BARU)
@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordModel):
    email_clean = data.email.strip().lower()
    try:
        # Generasi tautan reset password resmi dari Firebase Auth
        link = auth.generate_password_reset_link(email_clean)
        
        # Kirim tautan ke email pengguna
        send_reset_link_via_email(email_clean, link)
        
        return {
            "status": "success",
            "message": f"Link reset password berhasil dikirim ke email {email_clean}.",
            "reset_link": link  # Tautan dikembalikan di JSON untuk kemudahan testing lokal
        }
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar di sistem.")
    except (auth.InvalidEmailError, ValueError):
        raise HTTPException(status_code=400, detail="Format email tidak valid.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses reset password: {str(e)}")


# 6. GOOGLE LOGIN
@app.post("/auth/google-login")
def verify_google_token(data: GoogleLoginModel):
    try:
        decoded_token = auth.verify_id_token(data.id_token)
        user_info = {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture")
        }
        return {"status": "success", "message": "Login Google berhasil", "user": user_info}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Google tidak valid: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("Login:app", host="127.0.0.1", port=8000, reload=True)