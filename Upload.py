import os
import re
import json
import time
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from firebase_admin import firestore, auth
from google import genai
from google.genai import types

router = APIRouter(prefix="/api", tags=["Upload & Audio Review"])

# Model configuration (can be overridden in .env)
PRIMARY_MODEL = os.getenv("GEMINI_PRIMARY_MODEL", "gemini-4-hydrogen")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.8-flash")

ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".wav", ".m4a"}
MAX_AUDIO_DURATION_SECONDS = 300  # 5 minutes


def get_db():
    return firestore.client()


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY belum dikonfigurasi di server.")
    return genai.Client(api_key=api_key)


# 1. STRUCTURED JSON SCHEMAS (NO RAW MARKDOWN)
class FillerWordItem(BaseModel):
    word: str = Field(description="Kata pengisi yang terdeteksi, misal: 'uhhh', 'ehh', 'uhhmmm', 'eee', 'mmm'")
    count: int = Field(description="Jumlah kemunculan kata pengisi tersebut")


class VerbatimTranscriptSchema(BaseModel):
    transcript: str = Field(
        description="Transkrip verbatim lengkap dengan simbol intonasi (^, \\, -, ~, !, ?) dan seluruh filler words dipertahankan apa adanya."
    )
    spoken_duration_seconds: float = Field(
        description="Total durasi audio dalam detik dari awal hingga akhir rekaman."
    )
    total_words: int = Field(
        description="Jumlah total kata yang diucapkan dalam transkrip (termasuk filler words)."
    )
    filler_words: list[FillerWordItem] = Field(
        description="Daftar setiap filler word (uhhh, ehh, uhhmmm, eee, mmm, dll.) beserta jumlah kemunculannya."
    )


class SpeechReviewSchema(BaseModel):
    overall_score: int = Field(description="Skor keseluruhan public speaking dari 0 hingga 100.")
    summary: str = Field(description="Ringkasan evaluasi performa berbicara dalam teks polos tanpa simbol markdown.")
    wpm: int = Field(description="Kecepatan bicara dalam Words Per Minute (kata per menit).")
    wpm_status: str = Field(description="Kategori kecepatan bicara, misal: 'Ideal (120-150 WPM)', 'Terlalu Cepat', atau 'Terlalu Lambat'.")
    total_filler_words: int = Field(description="Total keseluruhan filler words yang digunakan.")
    filler_words_breakdown: list[FillerWordItem] = Field(description="Rincian jumlah masing-masing filler word.")
    strengths: list[str] = Field(description="Daftar poin kelebihan pembicara (teks polos tanpa simbol ** atau #).")
    areas_to_improve: list[str] = Field(description="Daftar saran perbaikan konkret (teks polos tanpa simbol ** atau #).")
    pacing_and_pitch_notes: str = Field(description="Catatan khusus mengenai tempo, jeda, dan variasi intonasi suara.")


# 2. VALIDATION & TOKEN HELPERS
def verify_user_and_tokens(user_id: str, db):
    if not re.match(r"^[a-zA-Z0-9]{20,36}$", user_id):
        raise HTTPException(status_code=400, detail="Format user_id tidak valid.")

    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        try:
            auth.get_user(user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="User ID tidak ditemukan.")

    today_str = datetime.now().strftime("%Y-%m-%d")

    if not user_doc.exists:
        user_data = {"tokens": 5, "last_token_reset": today_str}
        user_ref.set(user_data, merge=True)
        return user_ref, 5

    data = user_doc.to_dict() or {}
    current_tokens = data.get("tokens", 5)
    last_reset = data.get("last_token_reset", "")

    if last_reset != today_str:
        if current_tokens < 5:
            current_tokens = 5
        user_ref.update({"tokens": current_tokens, "last_token_reset": today_str})

    if current_tokens <= 0:
        raise HTTPException(status_code=403, detail="Token habis. Silakan tunggu reset harian atau beli paket token.")

    return user_ref, current_tokens


def get_mime_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    mime_map = {
        ".mp3": "audio/mpeg",
        ".mp4": "audio/mp4",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
    }
    if ext not in mime_map:
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Gunakan file audio .mp3, .m4a, .wav, atau .mp4."
        )
    return mime_map[ext]

# 3. GEMINI CALLER WITH RETRY & FALLBACK
def call_gemini_with_retry(
    client,
    contents,
    config=None,
    model: str = PRIMARY_MODEL,
    max_retries: int = 3
):
    models_to_try = [model]
    if FALLBACK_MODEL and FALLBACK_MODEL not in models_to_try:
        models_to_try.append(FALLBACK_MODEL)

    last_error = None

    for current_model in models_to_try:
        for attempt in range(max_retries):
            try:
                kwargs = {
                    "model": current_model,
                    "contents": contents,
                }
                if config is not None:
                    kwargs["config"] = config

                return client.models.generate_content(**kwargs)

            except Exception as e:
                last_error = e
                error_str = str(e)

                # Switch immediately to fallback if model identifier is invalid/not found
                if "404" in error_str or "NOT_FOUND" in error_str:
                    print(f"[Gemini Warning] Model '{current_model}' not found (404). Switching to fallback...")
                    break

                # Retry on temporary rate limits or server overload
                if any(code in error_str for code in ["503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED"]):
                    time.sleep(2 * (attempt + 1))
                    continue

                raise e

    raise HTTPException(
        status_code=502,
        detail=f"Gemini API gagal memproses audio setelah percobaan ulang: {str(last_error)}"
    )


# 4. MAIN UPLOAD & AUDIO REVIEW ENDPOINT
@router.post("/upload")
async def upload_and_review_audio(
    user_id: str = Form(...),
    event_context: Optional[str] = Form(None),
    source_type: Optional[str] = Form("upload"),
    file: UploadFile = File(...)
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="File audio wajib diunggah.")

    mime_type = get_mime_type(file.filename)
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="File audio kosong.")

    db = get_db()
    user_ref, current_tokens = verify_user_and_tokens(user_id, db)
    client = get_gemini_client()

    uploaded_gemini_file = None
    temp_file_path = None

    try:
        # Use inline bytes for files < 15MB, or Files API for larger recordings
        if len(file_bytes) < 15 * 1024 * 1024:
            audio_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        else:
            suffix = os.path.splitext(file.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_bytes)
                temp_file_path = tmp.name
            uploaded_gemini_file = client.files.upload(file=temp_file_path)
            audio_part = uploaded_gemini_file

        # STAGE 1: VERBATIM STT, PITCH & FILLER DETECTION
        stt_prompt = (
            "Dengarkan rekaman audio ini dengan teliti dan hasilkan transkrip VERBATIM (kata demi kata persis seperti yang diucapkan).\n"
            "Aturan wajib:\n"
            "1. JANGAN merapikan tata bahasa atau menghapus keraguan pembicara.\n"
            "2. Pertahankan dan hitung SEMUA kata pengisi (filler words) seperti 'uhhh', 'ehh', 'uhhmmm', 'eee', 'mmm', 'umm', 'anu', 'kayak', dll.\n"
            "3. Tambahkan simbol intonasi berdasarkan nada suara asli: '^' (nada naik), '\\' (nada turun), '-' (datar), '~' (ragu/bergetar), '!' (penekanan kuat), '?' (nada bertanya).\n"
            "4. Hitung total durasi audio dalam detik (spoken_duration_seconds) dan total kata yang diucapkan (total_words).\n"
            "5. Keluarkan hasil murni dalam format JSON sesuai skema tanpa simbol markdown seperti ** atau #."
        )

        stt_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=VerbatimTranscriptSchema,
            temperature=0.1,
        )

        stt_response = call_gemini_with_retry(
            client=client,
            contents=[audio_part, stt_prompt],
            config=stt_config
        )

        stt_data = json.loads(stt_response.text)
        duration_sec = float(stt_data.get("spoken_duration_seconds", 0))

        if duration_sec > MAX_AUDIO_DURATION_SECONDS:
            raise HTTPException(
                status_code=400,
                detail=f"Durasi audio ({int(duration_sec)} detik) melebihi batas maksimal 300 detik (5 menit)."
            )

        transcript_text = stt_data.get("transcript", "")
        total_words = int(stt_data.get("total_words", len(transcript_text.split())))
        filler_list = stt_data.get("filler_words", [])
        total_fillers = sum(int(item.get("count", 0)) for item in filler_list)

        # Calculate exact Words Per Minute (WPM) in Python
        calculated_wpm = round((total_words / duration_sec) * 60) if duration_sec > 0 else 0

        # STAGE 2: STRUCTURED PUBLIC SPEAKING REVIEW
        context_note = f"Konteks acara/presentasi: {event_context}." if event_context else "Konteks acara: Presentasi umum."

        review_prompt = (
            f"Kamu adalah pelatih public speaking profesional. Evaluasi hasil rekaman presentasi berikut dalam Bahasa Indonesia.\n"
            f"{context_note}\n"
            f"Data terukur:\n"
            f"- Durasi Audio: {round(duration_sec, 1)} detik\n"
            f"- Total Kata: {total_words} kata\n"
            f"- Kecepatan Bicara (WPM): {calculated_wpm} kata per menit (standar ideal presentasi adalah 120-150 WPM)\n"
            f"- Total Filler Words: {total_fillers} kali ({json.dumps(filler_list, ensure_ascii=False)})\n"
            f"- Transkrip Verbatim & Intonasi:\n{transcript_text}\n\n"
            f"Instruksi penting:\n"
            f"- Gunakan nilai wpm = {calculated_wpm} dan total_filler_words = {total_fillers}.\n"
            f"- Berikan evaluasi yang konstruktif, spesifik, dan mudah dibaca di aplikasi mobile.\n"
            f"- DILARANG KERAS menggunakan simbol Markdown apa pun (seperti **, *, #, atau _) di dalam teks JSON."
        )

        review_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SpeechReviewSchema,
            temperature=0.4,
        )

        review_response = call_gemini_with_retry(
            client=client,
            contents=[review_prompt],
            config=review_config
        )

        review_data = json.loads(review_response.text)
        # Ensure exact calculated metrics stay consistent
        review_data["wpm"] = calculated_wpm
        review_data["total_filler_words"] = total_fillers
        review_data["filler_words_breakdown"] = filler_list

        # SAVE TO FIRESTORE & DEDUCT 1 TOKEN
        history_ref = db.collection("upload_history").document()
        history_id = history_ref.id
        created_at = datetime.now().isoformat()

        record = {
            "history_id": history_id,
            "user_id": user_id,
            "file_name": file.filename,
            "source_type": source_type or "upload",
            "event_context": event_context or "",
            "duration_seconds": round(duration_sec, 1),
            "total_words": total_words,
            "wpm": calculated_wpm,
            "total_filler_words": total_fillers,
            "filler_words": filler_list,
            "transcript": transcript_text,
            "review": review_data,
            "created_at": created_at,
        }

        history_ref.set(record)
        user_ref.update({"tokens": current_tokens - 1})

        return {
            "status": "success",
            "history_id": history_id,
            "remaining_tokens": current_tokens - 1,
            "data": record
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat memproses audio: {str(e)}"
        )
    finally:
        if uploaded_gemini_file:
            try:
                client.files.delete(name=uploaded_gemini_file.name)
            except Exception:
                pass
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass