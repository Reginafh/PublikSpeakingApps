import os
import re
import time
import wave
import tempfile
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from firebase_admin import firestore, auth
from google import genai
import mutagen

from Home import get_updated_user_tokens

router = APIRouter(prefix="/api", tags=["Upload & Audio Review"])

# Inisialisasi Gemini Client (mengambil GEMINI_API_KEY dari environment variable)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Format audio yang didukung (File MP3 & hasil recording langsung dari Expo/React Native)
ALLOWED_AUDIO_FORMATS = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".mp4": "audio/mp4",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
}

MAX_DURATION_SECONDS = 300  # Maksimal 5 menit


def get_db():
    return firestore.client()


def validate_user(user_id: str, db):
    if not re.match(r"^[a-zA-Z0-9]{20,36}$", user_id):
        raise HTTPException(status_code=400, detail="Format user_id tidak valid.")

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        try:
            auth.get_user(user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="User ID tidak ditemukan.")


def get_audio_duration(file_path: str, ext: str) -> float:
    """Membaca durasi audio untuk .mp3, .m4a, .aac, .wav, .ogg, dll."""
    try:
        audio = mutagen.File(file_path)
        if audio is not None and hasattr(audio, "info") and hasattr(audio.info, "length"):
            return round(float(audio.info.length), 2)
    except Exception:
        pass

    # Fallback khusus file .wav mentah jika metadata mutagen kosong
    if ext == ".wav":
        try:
            with wave.open(file_path, "rb") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                return round(frames / float(rate), 2)
        except Exception:
            pass

    raise HTTPException(status_code=400, detail="File audio rusak atau durasi tidak dapat dibaca.")


def call_gemini_with_retry(contents, model_name: str = "gemini-3.8-flash", max_retries: int = 3):
    """Menangani lonjakan trafik server (503 UNAVAILABLE) dengan retry bertahap."""
    last_error = None
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(
                model=model_name,
                contents=contents,
            )
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                time.sleep(2 * (attempt + 1))  # Tunggu 2s, 4s, 6s
                continue
            raise e
    raise last_error


def build_context_instruction(event_context: str) -> str:
    context_rules = {
        "formal": (
            "Konteks acara adalah FORMAL (seperti sidang skripsi, seminar akademik, atau pidato resmi). "
            "Evaluasi ketegasan artikulasi, penggunaan bahasa baku, minimnya filler words, dan wibawa intonasi."
        ),
        "business": (
            "Konteks acara adalah BUSINESS (seperti pitching startup, presentasi klien, atau rapat korporat). "
            "Evaluasi daya persuasi, kejelasan poin utama, kepercayaan diri vokal, dan struktur penyampaian."
        ),
        "non_formal": (
            "Konteks acara adalah NON-FORMAL (seperti podcast, sharing santai, atau storytelling kasual). "
            "Evaluasi keluwesan nada bicara, ekspresivitas agar tidak terdengar kaku, dan keterlibatan pendengar."
        ),
        "keynote": (
            "Konteks acara adalah KEYNOTE SPEECH (pidato panggung utama / konferensi inspiratif). "
            "Evaluasi dinamika naik-turun nada, penekanan emosional pada kalimat kunci, jeda dramatis, dan energi vokal."
        ),
    }
    return context_rules.get(event_context, context_rules["formal"])


@router.post("/upload")
async def upload_and_review_audio(
    user_id: str = Form(...),
    event_context: Literal["formal", "business", "non_formal", "keynote"] = Form("formal"),
    source_type: Literal["upload", "recording"] = Form("upload"),
    file: UploadFile = File(...),
):
    db = get_db()
    validate_user(user_id, db)

    # 1. Cek ketersediaan token pengguna (minimal 1 token)
    user_token_data = get_updated_user_tokens(user_id)
    current_tokens = user_token_data.get("tokens", 0)
    if current_tokens < 1:
        raise HTTPException(
            status_code=403,
            detail="Token habis. Silakan tunggu reset harian jam 00:00 atau beli paket token.",
        )

    # 2. Validasi ekstensi file (.mp3 maupun format rekaman langsung .m4a/.wav/.aac)
    filename = file.filename or "recording.m4a"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Format file '{ext}' tidak didukung. Gunakan MP3 atau rekaman langsung (M4A/AAC/WAV).",
        )

    mime_type = ALLOWED_AUDIO_FORMATS[ext]
    tmp_path = None
    gemini_file = None

    try:
        # 3. Simpan sementara di disk lokal untuk cek durasi & unggah ke Gemini
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(status_code=400, detail="File audio kosong.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content_bytes)
            tmp_path = tmp.name

        # 4. Validasi durasi maksimal 5 menit (300 detik)
        duration_seconds = get_audio_duration(tmp_path, ext)
        if duration_seconds > MAX_DURATION_SECONDS:
            raise HTTPException(
                status_code=400,
                detail=f"Durasi audio ({duration_seconds} detik) melebihi batas maksimal 5 menit (300 detik).",
            )

        # 5. Unggah audio ke Gemini Files API
        gemini_file = client.files.upload(
            file=tmp_path,
            config={"mime_type": mime_type},
        )

        # 6. Tahap 1: Transkripsi Verbatim + Anotasi Simbol Pitch
        pitch_prompt = (
            "Transkripsikan rekaman audio ini secara VERBATIM (kata demi kata persis seperti yang diucapkan, "
            "jangan perbaiki tata bahasa, dan sertakan semua filler words seperti 'eee', 'emm', 'anu', 'kayak', 'um', 'uh').\n"
            "Tambahkan simbol intonasi/pitch tepat di akhir kata atau frasa yang relevan berdasarkan analisis suara aslinya:\n"
            "- `^` untuk nada naik\n"
            "- `\\` untuk nada turun\n"
            "- `~` untuk nada gemetar / ragu-ragu\n"
            "- `-` untuk nada datar / monoton\n"
            "- `!` untuk penekanan kuat / tegas\n"
            "- `?` untuk intonasi bertanya\n\n"
            "Berikan HANYA teks transkrip beranotasi tanpa pembuka atau penutup."
        )

        response_stt = call_gemini_with_retry([gemini_file, pitch_prompt])
        annotated_transcript = response_stt.text.strip()

        # 7. Tahap 2: Evaluasi Public Speaking Bersyarat berdasarkan Konteks Acara
        context_instruction = build_context_instruction(event_context)
        review_prompt = (
            f"Kamu adalah pelatih public speaking profesional. Analisis performa pembicara berdasarkan "
            f"transkrip beranotasi pitch dan audio berikut.\n"
            f"Aturan Konteks: {context_instruction}\n\n"
            f"Transkrip Verbatim + Pitch:\n\"{annotated_transcript}\"\n\n"
            f"Berikan evaluasi terstruktur dalam Bahasa Indonesia yang mencakup:\n"
            f"1. **Skor Keseluruhan (1-100)** sesuai konteks acara ({event_context}).\n"
            f"2. **Analisis Intonasi & Pitch** (evaluasi variasi nada `^`, `\\`, `~`, `-`, `!`, `?`).\n"
            f"3. **Deteksi Filler Words** (daftar kata pengisi yang muncul beserta perkiraan jumlahnya).\n"
            f"4. **Kelebihan & Saran Perbaikan Konkret** agar penyampaian berikutnya jauh lebih baik."
        )

        response_review = call_gemini_with_retry([gemini_file, review_prompt])
        speech_review = response_review.text.strip()

        # 8. Kurangi 1 token pengguna setelah proses AI berhasil
        new_tokens = current_tokens - 1
        db.collection("users").document(user_id).update({"tokens": new_tokens})

        # 9. Simpan riwayat evaluasi ke Firestore koleksi 'upload_history'
        doc_ref = db.collection("upload_history").document()
        history_id = doc_ref.id
        created_at = datetime.now(timezone.utc)

        history_record = {
            "history_id": history_id,
            "user_id": user_id,
            "filename": filename,
            "source_type": source_type,  # "upload" atau "recording"
            "event_context": event_context,
            "duration_seconds": duration_seconds,
            "annotated_transcript": annotated_transcript,
            "speech_review": speech_review,
            "created_at": created_at,
        }
        doc_ref.set(history_record)

        return {
            "status": "success",
            "history_id": history_id,
            "remaining_tokens": new_tokens,
            "data": {
                **history_record,
                "created_at": created_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat memproses audio: {str(e)}",
        )
    finally:
        # 10. Hapus file sementara di server lokal & server Gemini
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

        if gemini_file is not None:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass