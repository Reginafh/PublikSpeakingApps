import random
import time
import requests
import uvicorn
import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

cred = credentials.Certificate("serviceAccountKey.json")

# Cegah re-inisialisasi Firebase jika aplikasi sudah berjalan
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Inisialisasi database Firestore dan Firebase Web API Key
db = firestore.client()
FIREBASE_API_KEY = "AIzaSyAxVwcDDue3gyGJ9L-HGc3SjGNKr1u6z20"

# Inisialisasi aplikasi FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Server FastAPI Berhasil Berjalan!"}

# Skema data request untuk permintaan OTP
class RequestOTPModel(BaseModel):
    email: str

# Skema data request untuk verifikasi OTP
class VerifyOTPModel(BaseModel):
    email: str
    otp_code: str

# Skema data request untuk login Google
class GoogleLoginModel(BaseModel):
    id_token: str

# Endpoint untuk membuat OTP dan memicu pengiriman email dari Firebase
@app.post("/auth/request-otp")
def request_otp(data: RequestOTPModel):
    email = data.email
    generated_otp = str(random.randint(100000, 999999))
    expiration_time = time.time() + (5 * 60)

    # Simpan data OTP baru ke dokumen Firestore
    doc_ref = db.collection("otp_requests").document(email)
    doc_ref.set({
        "otp_code": generated_otp,
        "expires_at": expiration_time,
        "created_at": time.time(),
        "is_used": False
    })

    # Panggil REST API Firebase untuk mengirim email otomatis
    endpoint_url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_API_KEY}"
    payload = {
        "requestType": "EMAIL_SIGNIN",
        "email": email,
        "continueUrl": "https://idk-man-39e19.firebaseapp.com"
    }
    
    response = requests.post(endpoint_url, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Gagal mengirim email OTP via Firebase")
        
    return {"status": "success", "message": f"Kode OTP telah dikirim ke {email}"}

# Endpoint untuk memverifikasi kode OTP dari masukan pengguna
@app.post("/auth/verify-otp")
def verify_otp(data: VerifyOTPModel):
    doc_ref = db.collection("otp_requests").document(data.email)
    doc = doc_ref.get()

    # Periksa ketersediaan data permintaan OTP
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Email belum meminta kode OTP")

    otp_data = doc.to_dict()

    # Periksa apakah kode OTP sudah pernah dipakai
    if otp_data.get("is_used"):
        raise HTTPException(status_code=400, detail="Kode OTP sudah pernah digunakan")

    # Periksa apakah masa berlaku OTP sudah habis
    if time.time() > otp_data.get("expires_at"):
        raise HTTPException(status_code=400, detail="Kode OTP telah kadaluarsa")

    # Cocokkan kode OTP yang diinput dengan data Firestore
    if otp_data.get("otp_code") == data.otp_code:
        doc_ref.update({"is_used": True})
        return {"status": "success", "message": "Login OTP berhasil"}
    else:
        raise HTTPException(status_code=400, detail="Kode OTP salah")

# Endpoint untuk memverifikasi token login Google dari aplikasi frontend
@app.post("/auth/google-login")
def verify_google_token(data: GoogleLoginModel):
    try:
        # Verifikasi integritas id_token menggunakan Firebase Auth Admin
        decoded_token = auth.verify_id_token(data.id_token)
        
        # Ekstrak informasi profil pengguna dari token Google
        user_info = {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture")
        }
        
        return {"status": "success", "message": "Login Google berhasil", "user": user_info}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Google tidak valid: {str(e)}")

# Jalankan server FastAPI secara lokal pada port 8000
if __name__ == "__main__":
    uvicorn.run("Login:app", host="127.0.0.1", port=8000, reload=True)