import random
import time
import uvicorn
import smtplib
import requests  # Dipakai kembali untuk verifikasi password ke Firebase REST API
import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from email.mime.text import MIMEText

# Inisialisasi Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
FIREBASE_API_KEY = "AIzaSyAxVwcDDue3gyGJ9L-HGc3SjGNKr1u6z20"

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

class GoogleLoginModel(BaseModel):
    id_token: str


# ============================================================
# FUNGSI PEMBANTU (HELPER FUNCTIONS)
# ============================================================

def send_otp_via_email(target_email: str, otp_code: str):
    sender_email = "speakup.auth@gmail.com"  # Ganti dengan email pengirim
    sender_password = "yvhqxlnjppcewjul"     # 16 digit App Password Gmail
    
    subject = "Kode OTP Verifikasi - SpeakUp"
    body = f"""Halo,

Terima kasih telah menggunakan SpeakUp!

Berikut adalah kode verifikasi masuk kamu:
{otp_code}

Kode ini berlaku selama 5 menit. Mohon untuk tidak membagikan kode ini kepada siapa pun demi keamanan akun kamu.

Jika kamu tidak merasa melakukan permintaan ini, abaikan email ini.

Salam hangat,
Tim SpeakUp
"""

    msg = MIMEText(body, 'plain')
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = target_email

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, target_email, msg.as_string())


def generate_and_save_otp(email: str):
    """Membuat OTP acak, menyimpan ke Firestore, dan mengirim via email"""
    generated_otp = str(random.randint(100000, 999999))
    expiration_time = time.time() + (5 * 60)

    doc_ref = db.collection("otp_requests").document(email)
    doc_ref.set({
        "otp_code": generated_otp,
        "expires_at": expiration_time,
        "created_at": time.time(),
        "is_used": False
    })

    send_otp_via_email(email, generated_otp)


# ============================================================
# ENDPOINTS AUTENTIKASI
# ============================================================

# 1. SIGN-UP (PENDAFTARAN AKUN BARU)
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


# 2. SIGN-IN (LOGIN DENGAN EMAIL + PASSWORD -> MINTA OTP)
@app.post("/auth/login")
def login_with_password(data: LoginWithPasswordModel):
    # Verifikasi kata sandi ke Firebase Identity Toolkit REST API
    endpoint_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": data.email,
        "password": data.password,
        "returnSecureToken": True
    }

    response = requests.post(endpoint_url, json=payload)
    
    # Jika email atau password salah
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Email atau password yang kamu masukkan salah.")

    # Jika password benar, buat & kirimkan kode OTP
    try:
        generate_and_save_otp(data.email)
        return {
            "status": "success",
            "message": "Password benar. Kode OTP telah dikirimkan ke email kamu untuk verifikasi."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengirimkan email OTP: {str(e)}")


# 3. VERIFIKASI OTP (TAHAP AKHIR UNTUK MENDAPATKAN TOKEN)
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

    # Terbitkan Firebase Custom Token
    custom_token = auth.create_custom_token(email)
    token_str = custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token

    return {
        "status": "success",
        "message": "Verifikasi berhasil. Selamat datang!",
        "token": token_str
    }


# 4. GOOGLE LOGIN
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