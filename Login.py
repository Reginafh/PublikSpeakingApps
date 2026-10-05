import os
import random
import time
import uvicorn
import smtplib
import requests
import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Server FastAPI SpeakUp Berhasil Berjalan!"}


# ============================================================
# SKEMA DATA (PYDANTIC MODELS)
# ============================================================

class RegisterModel(BaseModel):
    email: str
    password: str

class LoginWithPasswordModel(BaseModel):
    email: str
    password: str

class VerifyOTPModel(BaseModel):
    email: str
    otp_code: str

class ResendOTPModel(BaseModel):
    email: str

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

# 1. SIGN-UP (PENDAFTARAN AKUN BARU + KIRIM OTP)
@app.post("/auth/register")
def register(data: RegisterModel):
    try:
        # Buat pengguna baru di Firebase Auth
        user = auth.create_user(
            email=data.email,
            password=data.password
        )
        
        # Kirim OTP untuk verifikasi pendaftaran
        generate_and_save_otp(data.email)
        
        return {
            "status": "success",
            "message": f"Akun {data.email} berhasil dibuat. Kode OTP telah dikirim ke email kamu."
        }
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email ini sudah terdaftar. Silakan lakukan Login.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan registrasi: {str(e)}")


# 2. SIGN-IN (LOGIN EMAIL + PASSWORD -> LANGSUNG LOGIN TANPA OTP)
@app.post("/auth/login")
def login_with_password(data: LoginWithPasswordModel):
    if not FIREBASE_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="FIREBASE_API_KEY belum diatur di file .env"
        )

    endpoint_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": data.email,
        "password": data.password,
        "returnSecureToken": True
    }

    response = requests.post(endpoint_url, json=payload)
    res_data = response.json()
    
    # Jika email atau password salah
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Email atau password yang kamu masukkan salah.")

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


# 3. VERIFIKASI OTP REGISTRASI
@app.post("/auth/verify-otp")
def verify_otp(data: VerifyOTPModel):
    email = data.email
    doc_ref = db.collection("otp_requests").document(email)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Email belum meminta kode OTP")

    otp_data = doc.to_dict()

    if otp_data.get("is_used"):
        raise HTTPException(status_code=400, detail="Kode OTP sudah pernah digunakan")

    if time.time() > otp_data.get("expires_at"):
        raise HTTPException(status_code=400, detail="Kode OTP telah kadaluarsa")

    if otp_data.get("otp_code") != data.otp_code:
        raise HTTPException(status_code=400, detail="Kode OTP salah")

    # Tandai OTP sudah digunakan
    doc_ref.update({"is_used": True})

    # Dapatkan User Token
    try:
        user = auth.get_user_by_email(email)
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
    email = data.email
    doc_ref = db.collection("otp_requests").document(email)
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
        generate_and_save_otp(email)
        return {
            "status": "success",
            "message": "Kode OTP baru berhasil dikirim ke email kamu."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengirim ulang OTP: {str(e)}")


# 5. GOOGLE LOGIN
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