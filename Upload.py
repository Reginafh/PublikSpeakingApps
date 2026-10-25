import os
import tempfile
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from firebase_admin import firestore
from dotenv import load_dotenv
from google import genai
from mutagen.mp3 import MP3

# Load environment variable dari file .env
load_dotenv()

router = APIRouter(prefix="/api/upload", tags=["Upload & AI Processing"])

CONTEXT_PROMPTS = {
    "formal": "Acara Formal (misal: Pidato Resmi, Simposium, Kelulusan). Evaluasi berdasarkan kejelasan artikulasi, intonasi terstruktur, penekanan berwibawa, minimnya vokal bergetar, dan kebersihan dari kata jeda.",
    "business": "Presentasi Bisnis / Pitching (misal: Investor Pitch, Meeting, Laporan). Evaluasi nada persuasif, kejelasan poin, ritme percaya diri, dinamika intonasi profesional, dan kelancaran alur berpikir.",
    "non_formal": "Acara Non-Formal / Kasual (misal: Podcast, Stand-up, Acara Komunitas). Evaluasi keaslian ekspresi, intonasi santai, keterikatan audiens, serta keluwesan bicara tanpa jeda canggung.",
    "keynote": "Keynote / Motivational Speech. Evaluasi kekuatan penekanan nada, perubahan pitch emosional, energi penyampaian, dan dinamika artikulasi."
}

@router.post("")
async def upload_and_analyze_audio(
    user_id: str = Form(...),
    event_context: str = Form("formal"),
    file: UploadFile = File(...)
):
    # Inisialisasi DB di dalam function agar Firebase Admin SDK sudah siap
    try:
        db = firestore.client()
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Gagal terhubung ke Firestore. Pastikan Firebase Admin SDK sudah terinisialisasi: {str(e)}"
        )

    # Validasi API Key Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY tidak ditemukan di file .env")

    if not file.filename.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Format file harus berupa .mp3")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Validasi Durasi Audio
        try:
            audio_info = MP3(tmp_path)
            duration_seconds = audio_info.info.length
        except Exception:
            raise HTTPException(status_code=400, detail="File MP3 tidak valid atau korup.")

        if duration_seconds > 300:
            raise HTTPException(
                status_code=400, 
                detail=f"Durasi audio melebihi batas maksimal 5 menit ({int(duration_seconds)} detik)."
            )

        # Inisialisasi Client Gemini
        client = genai.Client(api_key=api_key)

        # 1. Upload file ke Gemini
        uploaded_file = client.files.upload(file=tmp_path)

        # Prompt Transkripsi Verbatim + Pitch
        pitch_prompt = """
        Transkripsikan audio berikut secara VERBATIM (harfiah/apa adanya) ke dalam teks Bahasa Indonesia.
        SANGAT PENTING: Jangan hapus atau perbaiki kata-kata jeda / filler words (seperti 'eee', 'mmm', 'anu', 'kayak', 'jadi', 'apa ya', dll.) serta pengulangan kata/kalimat! Tulis persis seperti yang diucapkan pembicara.

        Selama transkripsi, selipkan simbol khusus di dalam kalimat untuk menandai variasi pitch dan intonasi pembicara:
        - ^ : Pitch naik (rising intonation / penekanan nada tinggi)
        - \\ : Pitch turun (falling intonation / penutup nada rendah)
        - ~ : Pitch gemetar / wavy (voice tremor / intonasi ragu-ragu)
        - - : Pitch datar / monoton (flat pitch)
        - ! : Pitch sangat tinggi / penekanan kuat (emphatic stress)
        - ? : Pitch menggantung / bernada tanya (interrogative pitch)

        Format Output: Kembalikan HANYA teks transkripsi verbatim yang sudah disisipi simbol pitch di atas.
        """
        # 1. Transkripsi Verbatim + Pitch
        response_stt = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=[uploaded_file, pitch_prompt]
        )
        annotated_transcript = response_stt.text

        # Prompt Reviewer Public Speaking
        context_description = CONTEXT_PROMPTS.get(event_context.lower(), CONTEXT_PROMPTS["formal"])
        
        review_prompt = f"""
        Kamu adalah Pelatih Public Speaking Profesional.
        Analisis teks transkripsi verbatim berikut yang telah dilengkapi indikator variasi pitch dan pencatatan kata jeda:

        Teks Pembicara (dengan Simbol Pitch & Filler Words):
        "{annotated_transcript}"

        Konteks Acara:
        {context_description}

        Berikan laporan evaluasi terstruktur dalam poin-poin berikut:
        1. **Analisis Filler Words & Pengulangan (Disfluency Check)**:
           - Kata Jeda/Penyambung ('eee', 'mmm', 'anu', dll.)
           - Pengulangan Kata/Kalimat
           - Dampak terhadap kredibilitas penyampaian
        2. **Analisis Variasi Pitch & Intonasi**:
           - Evaluasi sebaran pitch naik (^), turun (\\), datar (-), gemetar (~), penekanan (!), dan tanya (?)
        3. **Tempo & Kecepatan Pembicaraan**:
           - Evaluasi ritme dan jeda
        4. **Kesesuaian Konteks Acara**:
           - Evaluasi kesesuaian gaya bicara untuk acara {event_context}
        5. **Contoh Bagian yang Perlu Diperbaiki**:
           - 2-3 contoh frasa spesifik dari transkrip
        6. **Rekomendasi Latihan Khusus**:
           - 3-4 langkah konkret perbaikan
        """

        # 2. Reviewer Public Speaking
        response_review = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=[review_prompt]
        )
        speech_review = response_review.text

        # Hapus file sementara di server Gemini Storage
        client.files.delete(name=uploaded_file.name)

        # 2. Simpan Hasil Analisis ke Firestore
        history_ref = db.collection("upload_history").document()
        history_id = history_ref.id

        history_data = {
            "history_id": history_id,
            "user_id": user_id,
            "filename": file.filename,
            "duration_seconds": round(duration_seconds, 2),
            "event_context": event_context,
            "annotated_transcript": annotated_transcript,
            "speech_review": speech_review,
            "created_at": datetime.now(timezone.utc)
        }

        history_ref.set(history_data)

        # 3. Kembalikan Response
        return {
            "status": "success",
            "message": "File berhasil diunggah dan dianalisis.",
            "history_id": history_id,
            "user_id": user_id,
            "duration_seconds": round(duration_seconds, 2),
            "event_context": event_context,
            "annotated_transcript": annotated_transcript,
            "speech_review": speech_review
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Terjadi kesalahan saat memproses audio: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)