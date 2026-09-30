"""SQLite persistence layer for sessions, attempts, mastery states, and audit traces."""

import base64
import hashlib
import json
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


DB_PATH = Path(__file__).resolve().parent.parent.parent / "vidya.db"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Create and configure a SQLite connection with WAL mode enabled."""
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(str(target_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode and foreign keys for high concurrency and data integrity
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def _ensure_user_and_token_tables(conn: sqlite3.Connection) -> None:
    """Add auth-related schema if needed for backwards compatibility."""
    session_columns = [r[1] for r in conn.execute("PRAGMA table_info(sessions)").fetchall()]
    if "user_id" not in session_columns:
        conn.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT")

    user_columns = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
    if "name" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode('ascii')}${base64.b64encode(derived).decode('ascii')}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a user-entered password against the stored hash."""
    try:
        algorithm, salt_b64, digest_b64 = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return secrets.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _seed_demo_user(conn: sqlite3.Connection) -> None:
    """Seed default demo learner account for instant testing if not already present."""
    demo_email = "demo@vidya.ai"
    existing = conn.execute("SELECT id, password_hash FROM users WHERE email = ?", (demo_email,)).fetchone()
    if not existing:
        demo_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
            (demo_id, demo_email, hash_password("demo1234"), created_at, "Demo Learner"),
        )
    else:
        # Ensure password hash is valid for demo1234
        if not verify_password("demo1234", existing["password_hash"]):
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE email = ?",
                (hash_password("demo1234"), demo_email),
            )


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize database tables per MVP.md Section 3 schema."""
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS otp_verifications (
                email TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                topic TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        """)
        _ensure_user_and_token_tables(conn)
        _seed_demo_user(conn)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                concept_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                correct INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                ts TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mastery (
                session_id TEXT NOT NULL,
                concept_id TEXT NOT NULL,
                p_known REAL NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (session_id, concept_id),
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS traces (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                step INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                ts TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                concept_id TEXT NOT NULL,
                difficulty INTEGER NOT NULL,
                question TEXT NOT NULL,
                options_json TEXT NOT NULL,
                answer_index INTEGER NOT NULL,
                explanation_hint TEXT,
                created_at TEXT NOT NULL
            );
        """)
    conn.close()


def create_user(email: str, password: str, name: str = "", db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Create a new user record with a hashed password."""
    normalized_email = email.strip().lower()
    cleaned_name = (name or "").strip()
    if not normalized_email:
        raise ValueError("Email is required.")
    if "@" not in normalized_email:
        raise ValueError("Email is invalid.")
    if not cleaned_name:
        raise ValueError("Name is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    conn = get_connection(db_path)
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (normalized_email,)).fetchone()
    if existing:
        conn.close()
        raise ValueError("A user with this email already exists.")

    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    with conn:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
            (user_id, normalized_email, hash_password(password), created_at, cleaned_name),
        )
    conn.close()
    return {"id": user_id, "email": normalized_email, "name": cleaned_name, "created_at": created_at}


def create_otp_request(email: str, name: str, password: str, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Store a pending OTP verification for email signup."""
    normalized_email = email.strip().lower()
    cleaned_name = (name or "").strip()
    if not normalized_email or "@" not in normalized_email:
        raise ValueError("Valid email is required.")
    if not cleaned_name:
        raise ValueError("Name is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    conn = get_connection(db_path)
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (normalized_email,)).fetchone()
    if existing:
        conn.close()
        raise ValueError("A user with this email already exists.")

    otp_code = f"{secrets.randbelow(900000) + 100000}"  # guaranteed 6-digit OTP string
    pw_hash = hash_password(password)
    now = datetime.now(timezone.utc)
    expires_at = (now + datetime.timedelta(seconds=600) if hasattr(datetime, 'timedelta') else now).isoformat()
    # Using datetime.fromtimestamp or timedelta safely
    from datetime import timedelta
    expires_at = (now + timedelta(minutes=10)).isoformat()
    created_at = now.isoformat()

    with conn:
        conn.execute(
            """
            INSERT INTO otp_verifications (email, name, password_hash, otp_code, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                password_hash = excluded.password_hash,
                otp_code = excluded.otp_code,
                expires_at = excluded.expires_at,
                created_at = excluded.created_at
            """,
            (normalized_email, cleaned_name, pw_hash, otp_code, expires_at, created_at),
        )
    conn.close()
    return {
        "email": normalized_email,
        "name": cleaned_name,
        "otp_code": otp_code,
        "expires_at": expires_at,
    }


def verify_and_create_user(email: str, otp_code: str, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Verify OTP and complete user account creation."""
    normalized_email = email.strip().lower()
    clean_otp = (otp_code or "").strip()
    if not normalized_email or not clean_otp:
        raise ValueError("Email and OTP code are required.")

    conn = get_connection(db_path)
    row = conn.execute(
        "SELECT email, name, password_hash, otp_code, expires_at FROM otp_verifications WHERE email = ?",
        (normalized_email,),
    ).fetchone()

    if row is None:
        conn.close()
        raise ValueError("No pending signup found for this email. Please request a new OTP.")

    if row["otp_code"] != clean_otp:
        conn.close()
        raise ValueError("Invalid OTP code. Please check your email and try again.")

    expires_at_dt = datetime.fromisoformat(row["expires_at"])
    now_dt = datetime.now(timezone.utc)
    if expires_at_dt < now_dt:
        conn.close()
        raise ValueError("OTP verification code has expired. Please click Resend OTP.")

    # Check if user was already created in the meantime
    user_id = str(uuid.uuid4())
    created_at = now_dt.isoformat()

    with conn:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
            (user_id, normalized_email, row["password_hash"], created_at, row["name"]),
        )
        conn.execute("DELETE FROM otp_verifications WHERE email = ?", (normalized_email,))

    conn.close()
    return {"id": user_id, "email": normalized_email, "name": row["name"], "created_at": created_at}


def resend_otp_code(email: str, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Re-generate a fresh OTP for a pending registration."""
    normalized_email = email.strip().lower()
    conn = get_connection(db_path)
    row = conn.execute(
        "SELECT email, name, password_hash FROM otp_verifications WHERE email = ?",
        (normalized_email,),
    ).fetchone()

    if row is None:
        conn.close()
        raise ValueError("No pending signup found for this email. Please enter your signup details again.")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=10)).isoformat()

    with conn:
        conn.execute(
            """
            UPDATE otp_verifications
            SET otp_code = ?, expires_at = ?, created_at = ?
            WHERE email = ?
            """,
            (otp_code, expires_at, now.isoformat(), normalized_email),
        )
    conn.close()
    return {
        "email": normalized_email,
        "name": row["name"],
        "otp_code": otp_code,
        "expires_at": expires_at,
    }


def authenticate_user(email: str, password: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Authenticate a user by email and password."""
    normalized_email = email.strip().lower()
    conn = get_connection(db_path)
    row = conn.execute(
        "SELECT id, email, password_hash, created_at, name FROM users WHERE email = ?",
        (normalized_email,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "created_at": row["created_at"],
    }


def create_auth_token(user_id: str, db_path: Optional[Path] = None) -> str:
    """Create a bearer token for an authenticated user."""
    token = secrets.token_urlsafe(32)
    created_at = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            "INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, created_at),
        )
    conn.close()
    return token


def get_user_by_token(token: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Look up the authenticated user for a bearer token."""
    if not token:
        return None
    conn = get_connection(db_path)
    row = conn.execute(
        """
        SELECT u.id, u.email, u.name, u.created_at
        FROM auth_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = ?
        """,
        (token,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"], "name": row["name"], "created_at": row["created_at"]}


def create_session(session_id: str, topic: Optional[str] = None, user_id: Optional[str] = None, db_path: Optional[Path] = None) -> str:
    """Record a new learning session."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            "INSERT INTO sessions (id, user_id, topic, created_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, topic, now_iso),
        )
    conn.close()
    return now_iso


def get_session(session_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve session record by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, topic, created_at FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "topic": row["topic"],
            "created_at": row["created_at"],
        }
    return None


def get_mastery(session_id: str, concept_id: str, db_path: Optional[Path] = None) -> Optional[float]:
    """Get current p_known for a session's concept."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT p_known FROM mastery WHERE session_id = ? AND concept_id = ?",
        (session_id, concept_id),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return float(row["p_known"])
    return None


def get_all_mastery(session_id: str, db_path: Optional[Path] = None) -> Dict[str, float]:
    """Get all concept mastery probabilities for a session."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT concept_id, p_known FROM mastery WHERE session_id = ?",
        (session_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return {row["concept_id"]: float(row["p_known"]) for row in rows}


def set_mastery(session_id: str, concept_id: str, p_known: float, db_path: Optional[Path] = None) -> None:
    """Insert or update concept mastery probability."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT INTO mastery (session_id, concept_id, p_known, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id, concept_id) DO UPDATE SET
                p_known = excluded.p_known,
                updated_at = excluded.updated_at
        """, (session_id, concept_id, p_known, now_iso))
    conn.close()


def record_attempt(
    attempt_id: str,
    session_id: str,
    concept_id: str,
    question_id: str,
    correct: bool,
    latency_ms: int,
    db_path: Optional[Path] = None,
) -> None:
    """Log an answer attempt."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            INSERT INTO attempts (id, session_id, concept_id, question_id, correct, latency_ms, ts)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (attempt_id, session_id, concept_id, question_id, 1 if correct else 0, latency_ms, now_iso),
        )
    conn.close()


def get_recent_attempts(
    session_id: str,
    concept_id: Optional[str] = None,
    limit: int = 10,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve recent answer attempts for a session/concept."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    if concept_id:
        cursor.execute(
            """
            SELECT id, session_id, concept_id, question_id, correct, latency_ms, ts
            FROM attempts
            WHERE session_id = ? AND concept_id = ?
            ORDER BY ts DESC LIMIT ?
            """,
            (session_id, concept_id, limit),
        )
    else:
        cursor.execute(
            """
            SELECT id, session_id, concept_id, question_id, correct, latency_ms, ts
            FROM attempts
            WHERE session_id = ?
            ORDER BY ts DESC LIMIT ?
            """,
            (session_id, limit),
        )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "session_id": r["session_id"],
            "concept_id": r["concept_id"],
            "question_id": r["question_id"],
            "correct": bool(r["correct"]),
            "latency_ms": r["latency_ms"],
            "ts": r["ts"],
        }
        for r in rows
    ]


def append_trace(
    trace_id: str,
    session_id: str,
    step: int,
    payload: Dict[str, Any],
    db_path: Optional[Path] = None,
) -> None:
    """Append structured trace step."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            INSERT INTO traces (id, session_id, step, payload_json, ts)
            VALUES (?, ?, ?, ?, ?)
            """,
            (trace_id, session_id, step, json.dumps(payload), now_iso),
        )
    conn.close()


def get_traces(session_id: str, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Retrieve all traces for a session in order of step."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT step, payload_json, ts
        FROM traces
        WHERE session_id = ?
        ORDER BY step ASC
        """,
        (session_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "step": r["step"],
            "payload": json.loads(r["payload_json"]),
            "ts": r["ts"],
        }
        for r in rows
    ]


def get_next_trace_step(session_id: str, db_path: Optional[Path] = None) -> int:
    """Get the next sequential step number for trace logging."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(step) as max_step FROM traces WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row and row["max_step"] is not None:
        return int(row["max_step"]) + 1
    return 1


def save_question(q_dict: Dict[str, Any], db_path: Optional[Path] = None) -> None:
    """Persist a question to the database."""
    if not q_dict or "id" not in q_dict or "question" not in q_dict:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            INSERT INTO questions (id, concept_id, difficulty, question, options_json, answer_index, explanation_hint, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                question = excluded.question,
                options_json = excluded.options_json,
                answer_index = excluded.answer_index,
                explanation_hint = excluded.explanation_hint
            """,
            (
                q_dict["id"],
                q_dict.get("concept", ""),
                int(q_dict.get("difficulty", 1)),
                q_dict["question"],
                json.dumps(q_dict.get("options", [])),
                int(q_dict.get("answer_index", 0)),
                q_dict.get("explanation_hint", ""),
                now_iso,
            ),
        )
    conn.close()


def get_question(question_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve question record by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, concept_id, difficulty, question, options_json, answer_index, explanation_hint
        FROM questions
        WHERE id = ?
        """,
        (question_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "concept": row["concept_id"],
            "difficulty": row["difficulty"],
            "question": row["question"],
            "options": json.loads(row["options_json"]),
            "answer_index": row["answer_index"],
            "explanation_hint": row["explanation_hint"],
        }
    return None


def get_session_answered_questions(session_id: str, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Retrieve all distinct questions that have been answered in this session."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT q.id, q.concept_id, q.difficulty, q.question, q.options_json, q.answer_index, q.explanation_hint, a.correct, a.ts
        FROM attempts a
        JOIN questions q ON a.question_id = q.id
        WHERE a.session_id = ?
        ORDER BY a.ts ASC
        """,
        (session_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "concept": r["concept_id"],
            "difficulty": r["difficulty"],
            "question": r["question"],
            "options": json.loads(r["options_json"]),
            "answer_index": r["answer_index"],
            "explanation_hint": r["explanation_hint"],
            "correct": bool(r["correct"]),
            "ts": r["ts"],
        }
        for r in rows
    ]

