import os
import json
import wave
import tempfile
from datetime import datetime
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

# Ensure environment variables exist before importing app modules
os.environ.setdefault("FIREBASE_API_KEY", "AIzaSyTestKeyForUnitTesting12345")
os.environ.setdefault("SENDER_EMAIL", "speakup.test@gmail.com")
os.environ.setdefault("SENDER_PASSWORD", "test_app_password")
os.environ.setdefault("GEMINI_API_KEY", "test_gemini_api_key")


class DummyDocSnapshot:
    def __init__(self, doc_id: str, data: dict | None):
        self.id = doc_id
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict:
        return dict(self._data) if self._data is not None else {}


class DummyDocRef:
    def __init__(self, store: dict, doc_id: str):
        self._store = store
        self.id = doc_id

    def get(self) -> DummyDocSnapshot:
        return DummyDocSnapshot(self.id, self._store.get(self.id))

    def set(self, data: dict, merge: bool = False):
        if merge and self.id in self._store and isinstance(self._store[self.id], dict):
            updated = dict(self._store[self.id])
            updated.update(data)
            self._store[self.id] = updated
        else:
            self._store[self.id] = dict(data)

    def update(self, data: dict):
        if self.id not in self._store:
            self._store[self.id] = {}
        self._store[self.id].update(data)


class DummyQuery:
    def __init__(self, store: dict, field: str, op: str, value):
        self._store = store
        self._field = field
        self._op = op
        self._value = value

    def stream(self):
        results = []
        for doc_id, data in self._store.items():
            if isinstance(data, dict) and self._op == "==" and data.get(self._field) == self._value:
                results.append(DummyDocSnapshot(doc_id, data))
        return results


class DummyCollection:
    def __init__(self, store: dict):
        self._store = store
        self._counter = 1

    def document(self, doc_id: str | None = None) -> DummyDocRef:
        if doc_id is None:
            doc_id = f"histDoc{self._counter:015d}"
            self._counter += 1
        return DummyDocRef(self._store, doc_id)

    def where(self, field: str, op: str, value) -> DummyQuery:
        return DummyQuery(self._store, field, op, value)

    def stream(self):
        return [DummyDocSnapshot(doc_id, data) for doc_id, data in self._store.items()]


class DummyFirestoreClient:
    def __init__(self, collections: dict):
        self._collections = collections

    def collection(self, name: str) -> DummyCollection:
        if name not in self._collections:
            self._collections[name] = {}
        return DummyCollection(self._collections[name])


class DummyAuthUser:
    def __init__(self, uid: str, email: str, email_verified: bool = False):
        self.uid = uid
        self.email = email
        self.email_verified = email_verified


class FakeFirebaseAuth:
    def __init__(self):
        self.users_by_email = {}
        self.users_by_uid = {}
        self._uid_seq = 10000000000000000000

    def _next_uid(self) -> str:
        self._uid_seq += 1
        return f"UidTest{self._uid_seq}"[:28]

    def create_user(self, email: str, password: str, email_verified: bool = False):
        if email in self.users_by_email:
            from firebase_admin import auth
            raise auth.EmailAlreadyExistsError(f"Email {email} already exists")
        uid = self._next_uid()
        user = DummyAuthUser(uid=uid, email=email, email_verified=email_verified)
        self.users_by_email[email] = {"uid": uid, "email": email, "password": password, "email_verified": email_verified}
        self.users_by_uid[uid] = user
        return user

    def get_user_by_email(self, email: str):
        if email not in self.users_by_email:
            from firebase_admin import auth
            raise auth.UserNotFoundError(f"No user found for email {email}")
        info = self.users_by_email[email]
        return DummyAuthUser(uid=info["uid"], email=info["email"], email_verified=info["email_verified"])

    def get_user(self, uid: str):
        if uid not in self.users_by_uid:
            from firebase_admin import auth
            raise auth.UserNotFoundError(f"No user found for uid {uid}")
        return self.users_by_uid[uid]

    def update_user(self, uid: str, email_verified: bool | None = None):
        if uid not in self.users_by_uid:
            from firebase_admin import auth
            raise auth.UserNotFoundError(f"No user found for uid {uid}")
        if email_verified is not None:
            self.users_by_uid[uid].email_verified = email_verified
            for info in self.users_by_email.values():
                if info["uid"] == uid:
                    info["email_verified"] = email_verified
        return self.users_by_uid[uid]

    def delete_user(self, uid: str):
        user = self.users_by_uid.pop(uid, None)
        if user and user.email in self.users_by_email:
            del self.users_by_email[user.email]

    def create_custom_token(self, uid: str) -> bytes:
        return f"custom_token_for_{uid}".encode("utf-8")

    def generate_password_reset_link(self, email: str) -> str:
        return f"https://example.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=TEST123&email={email}"


def make_wav_bytes(duration_sec: float = 1.0, sample_rate: int = 8000) -> bytes:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp_path = tmp.name
    try:
        n_frames = int(duration_sec * sample_rate)
        with wave.open(tmp_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(b"\x00\x00" * n_frames)
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@pytest.fixture
def api_client():
    collections = {
        "users": {
            "RJ7wto2wWib7VP7N6nv4trvX8Zf2": {
                "tokens": 5,
                "last_token_reset": datetime.now().strftime("%Y-%m-%d"),
                "name": "Initial User",
                "notifications_enabled": True,
                "theme": "light",
            }
        },
        "otp_requests": {},
        "upload_history": {},
    }
    fake_db = DummyFirestoreClient(collections)
    fake_auth = FakeFirebaseAuth()
    seed_user = DummyAuthUser(
        uid="RJ7wto2wWib7VP7N6nv4trvX8Zf2",
        email="user9120813@test.com",
        email_verified=True,
    )
    fake_auth.users_by_uid[seed_user.uid] = seed_user
    fake_auth.users_by_email[seed_user.email] = {
        "uid": seed_user.uid,
        "email": seed_user.email,
        "password": "password123",
        "email_verified": True,
    }

    from firebase_admin import auth as fb_auth_module

    with patch("firebase_admin.credentials.Certificate", return_value=MagicMock()), \
         patch("firebase_admin.initialize_app"), \
         patch("firebase_admin.firestore.client", return_value=fake_db), \
         patch.object(fb_auth_module, "create_user", side_effect=fake_auth.create_user), \
         patch.object(fb_auth_module, "get_user_by_email", side_effect=fake_auth.get_user_by_email), \
         patch.object(fb_auth_module, "get_user", side_effect=fake_auth.get_user), \
         patch.object(fb_auth_module, "update_user", side_effect=fake_auth.update_user), \
         patch.object(fb_auth_module, "delete_user", side_effect=fake_auth.delete_user), \
         patch.object(fb_auth_module, "create_custom_token", side_effect=fake_auth.create_custom_token), \
         patch.object(fb_auth_module, "generate_password_reset_link", side_effect=fake_auth.generate_password_reset_link), \
         patch("smtplib.SMTP") as mock_smtp:

        smtp_instance = MagicMock()
        mock_smtp.return_value.__enter__.return_value = smtp_instance

        import Login
        import Home
        import Upload

        fake_auth.UserNotFoundError = fb_auth_module.UserNotFoundError
        fake_auth.EmailAlreadyExistsError = fb_auth_module.EmailAlreadyExistsError

        Login.db = fake_db
        Home.get_db = lambda: fake_db
        Upload.get_db = lambda: fake_db

        # Mock Gemini client so tests run offline without external API calls or invalid model names
        fake_gemini_file = MagicMock()
        fake_gemini_file.name = "files/mock-audio-123"

        def fake_generate_content(model, contents):
            resp = MagicMock()
            prompt_text = contents[1] if isinstance(contents, list) and len(contents) > 1 else ""
            if "Transkripsikan rekaman audio" in prompt_text:
                resp.text = "Halo semuanya^, hari ini kita bahas ~ produk kita!\n"
            else:
                resp.text = (
                    "1. **Skor Keseluruhan (1-100)**: 82/100\n"
                    "2. **Analisis Intonasi & Pitch**: Variasi nada cukup baik (`^`, `~`, `!`).\n"
                    "3. **Deteksi Filler Words**: Tidak ditemukan filler words dominan.\n"
                    "4. **Kelebihan & Saran Perbaikan Konkret**: Kurangi nada ragu (`~`) saat presentasi."
                )
            return resp

        Upload.client.files.upload = MagicMock(return_value=fake_gemini_file)
        Upload.client.files.delete = MagicMock()
        Upload.client.models.generate_content = MagicMock(side_effect=fake_generate_content)

        client = TestClient(Login.app)
        yield {
            "client": client,
            "collections": collections,
            "fake_auth": fake_auth,
            "smtp": smtp_instance,
            "Upload": Upload,
        }


# --- AUTH TESTS ---
def test_register_short_password_returns_422(api_client):
    res = api_client["client"].post(
        "/auth/register",
        json={"email": "shortpass@gmail.com", "password": "123"},
    )
    assert res.status_code == 422


def test_register_and_verify_otp_flow(api_client):
    email = "speaker.test@gmail.com"
    reg_res = api_client["client"].post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert reg_res.status_code == 200
    assert email in api_client["collections"]["otp_requests"]

    saved_otp = api_client["collections"]["otp_requests"][email]["otp_code"]

    # Wrong OTP -> 400 "Kode OTP salah"
    wrong_res = api_client["client"].post(
        "/auth/verify-otp",
        json={"email": email, "otp_code": "000000"},
    )
    assert wrong_res.status_code == 400
    assert wrong_res.json()["detail"] == "Kode OTP salah"

    # Right OTP -> 200 & verified
    ok_res = api_client["client"].post(
        "/auth/verify-otp",
        json={"email": email, "otp_code": saved_otp},
    )
    assert ok_res.status_code == 200
    assert api_client["fake_auth"].get_user_by_email(email).email_verified is True

    # Resend OTP for already verified user -> 400
    resend_verified = api_client["client"].post("/auth/resend-otp", json={"email": email})
    assert resend_verified.status_code == 400
    assert resend_verified.json()["detail"] == "Akun sudah terverifikasi."


def test_resend_otp_and_reset_password_unregistered_404(api_client):
    r1 = api_client["client"].post("/auth/resend-otp", json={"email": "ghost.user@gmail.com"})
    assert r1.status_code == 404

    r2 = api_client["client"].post("/auth/reset-password", json={"email": "ghost.user@gmail.com"})
    assert r2.status_code == 404


def test_reset_password_does_not_leak_reset_link(api_client):
    email = "user9120813@test.com"
    res = api_client["client"].post("/auth/reset-password", json={"email": email})
    assert res.status_code == 200
    body = res.json()
    assert "reset_link" not in body
    assert api_client["smtp"].sendmail.called


# --- HOME, STORE & PROFILE TESTS ---
def test_home_summary_validation_and_success(api_client):
    bad_fmt = api_client["client"].get("/api/home/summary/12345")
    assert bad_fmt.status_code == 400

    not_found = api_client["client"].get("/api/home/summary/RJ7wto2wWib7VP7N6nv4trvX8123")
    assert not_found.status_code == 404

    ok = api_client["client"].get("/api/home/summary/RJ7wto2wWib7VP7N6nv4trvX8Zf2")
    assert ok.status_code == 200
    data = ok.json()
    assert data["status"] == "success"
    assert "tokens" in data
    assert "recent_history" in data


def test_store_info_and_buy_token(api_client):
    bad = api_client["client"].get("/api/store/info/1")
    assert bad.status_code == 400

    buy = api_client["client"].post(
        "/api/store/buy",
        json={"user_id": "RJ7wto2wWib7VP7N6nv4trvX8Zf2", "package_id": "pkg_10"},
    )
    assert buy.status_code == 200
    assert buy.json()["new_token_balance"] == 15


def test_profile_settings_strict_validation_and_update(api_client):
    bad = api_client["client"].put(
        "/api/profile/settings",
        json={"user_id": "1", "name": "1", "notifications_enabled": 1, "theme": "1"},
    )
    assert bad.status_code == 422

    ok = api_client["client"].put(
        "/api/profile/settings",
        json={
            "user_id": "RJ7wto2wWib7VP7N6nv4trvX8Zf2",
            "name": "Ivander",
            "notifications_enabled": False,
            "theme": "dark",
        },
    )
    assert ok.status_code == 200


# --- UPLOAD & HISTORY TESTS ---
def test_upload_unsupported_format_and_success(api_client):
    bad_ext = api_client["client"].post(
        "/api/upload",
        data={"user_id": "RJ7wto2wWib7VP7N6nv4trvX8Zf2", "event_context": "formal", "source_type": "upload"},
        files={"file": ("Home.py", b"print('hi')", "text/plain")},
    )
    assert bad_ext.status_code == 400

    wav_bytes = make_wav_bytes(duration_sec=1.0)
    ok = api_client["client"].post(
        "/api/upload",
        data={"user_id": "RJ7wto2wWib7VP7N6nv4trvX8Zf2", "event_context": "business", "source_type": "recording"},
        files={"file": ("pitch.wav", wav_bytes, "audio/wav")},
    )
    assert ok.status_code == 200
    payload = ok.json()
    assert payload["status"] == "success"
    assert payload["remaining_tokens"] == 4
    history_id = payload["history_id"]

    # Check history endpoints
    all_hist = api_client["client"].get("/api/history/all/RJ7wto2wWib7VP7N6nv4trvX8Zf2")
    assert all_hist.status_code == 200
    assert all_hist.json()["total"] == 1

    detail_hist = api_client["client"].get(f"/api/history/detail/{history_id}")
    assert detail_hist.status_code == 200
    assert detail_hist.json()["data"]["history_id"] == history_id
