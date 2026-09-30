"""Database persistence layer supporting both SQLite (local/testing) and PostgreSQL (Supabase/Neon/Cloud).

Provides unified storage for users, auth sessions, attempts, BKT mastery states, audit traces, and question banks.
Optimized for low-latency network connections with connection pooling and multi-statement batching.
"""

import base64
import hashlib
import json
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


DB_PATH = Path(__file__).resolve().parent.parent.parent / "vidya.db"
_PG_POOL = None


def is_postgres(db_path: Optional[Any] = None) -> bool:
    """Check if PostgreSQL (Supabase/Neon) is configured in environment and not overridden by local path."""
    if db_path is not None and isinstance(db_path, (Path, str)):
        return False
    db_url = os.getenv("DATABASE_URL", "").strip()
    return db_url.startswith("postgresql://") or db_url.startswith("postgres://")


def get_pg_pool():
    """Get or initialize thread-safe PostgreSQL connection pool."""
    global _PG_POOL
    if _PG_POOL is None or getattr(_PG_POOL, "closed", True):
        import psycopg2.pool
        from psycopg2.extras import RealDictCursor

        db_url = os.getenv("DATABASE_URL", "").strip()
        _PG_POOL = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=db_url,
            cursor_factory=RealDictCursor,
            connect_timeout=10,
        )
    return _PG_POOL


def get_pg_connection():
    """Create a single psycopg2 connection to PostgreSQL / Supabase with RealDictCursor."""
    import psycopg2
    from psycopg2.extras import RealDictCursor

    db_url = os.getenv("DATABASE_URL", "").strip()
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    return conn


def get_sqlite_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Create and configure a SQLite connection with WAL mode enabled."""
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(str(target_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


class QueryExecutor:
    """Unified query executor adapting between SQLite (?) and PostgreSQL (%s) with connection pooling."""

    def __init__(self, db_path: Optional[Path] = None):
        self.use_pg = is_postgres(db_path)
        self.db_path = db_path
        self._pool = None
        if self.use_pg:
            try:
                self._pool = get_pg_pool()
                self.conn = self._pool.getconn()
            except Exception:
                self._pool = None
                self.conn = get_pg_connection()
        else:
            self.conn = get_sqlite_connection(db_path)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                self.conn.rollback()
            else:
                self.conn.commit()
        finally:
            if self.use_pg and self._pool is not None:
                try:
                    self._pool.putconn(self.conn)
                except Exception:
                    pass
            elif not self.use_pg:
                self.conn.close()

    def _format_sql(self, sql: str) -> str:
        if self.use_pg:
            return sql.replace("?", "%s")
        return sql

    def execute(self, sql: str, params: Tuple[Any, ...] = ()):
        cursor = self.conn.cursor()
        formatted_sql = self._format_sql(sql)
        cursor.execute(formatted_sql, params)
        return cursor

    def fetchone(self, sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        formatted_sql = self._format_sql(sql)
        cursor.execute(formatted_sql, params)
        row = cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    def fetchall(self, sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        formatted_sql = self._format_sql(sql)
        cursor.execute(formatted_sql, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def get_connection(db_path: Optional[Path] = None):
    """Backwards compatibility for direct connection requests."""
    if is_postgres(db_path):
        return get_pg_connection()
    return get_sqlite_connection(db_path)


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


def _seed_demo_user(db_path: Optional[Path] = None) -> None:
    """Seed default demo learner account (demo@vidya.ai / demo1234) for instant testing if not present."""
    demo_email = "demo@vidya.ai"
    with QueryExecutor(db_path) as qe:
        existing = qe.fetchone("SELECT id, password_hash FROM users WHERE email = ?", (demo_email,))
        if not existing:
            demo_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc).isoformat()
            qe.execute(
                "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
                (demo_id, demo_email, hash_password("demo1234"), created_at, "Demo Learner"),
            )
        else:
            if not verify_password("demo1234", existing["password_hash"]):
                qe.execute(
                    "UPDATE users SET password_hash = ?, name = ? WHERE email = ?",
                    (hash_password("demo1234"), "Demo Learner", demo_email),
                )


PG_SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_verifications (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    topic TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    correct INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mastery (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    p_known DOUBLE PRECISION NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (session_id, concept_id)
);
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    step INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    ts TEXT NOT NULL
);
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
"""

SQLITE_SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS otp_verifications (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    topic TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
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
CREATE TABLE IF NOT EXISTS mastery (
    session_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    p_known REAL NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (session_id, concept_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    ts TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
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
"""


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize database tables on SQLite or PostgreSQL (Supabase/Neon) in a single fast transaction."""
    use_pg = is_postgres(db_path)

    if use_pg:
        conn = get_pg_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(PG_SCHEMA_DDL)
        conn.close()
    else:
        conn = get_sqlite_connection(db_path)
        with conn:
            conn.executescript(SQLITE_SCHEMA_DDL)
        conn.close()

    # Seed demo credentials on configured database (Postgres or SQLite)
    _seed_demo_user(db_path)


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

    with QueryExecutor(db_path) as qe:
        existing = qe.fetchone("SELECT id FROM users WHERE email = ?", (normalized_email,))
        if existing:
            raise ValueError("A user with this email already exists.")

        user_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        qe.execute(
            "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
            (user_id, normalized_email, hash_password(password), created_at, cleaned_name),
        )
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

    with QueryExecutor(db_path) as qe:
        existing = qe.fetchone("SELECT id FROM users WHERE email = ?", (normalized_email,))
        if existing:
            raise ValueError("A user with this email already exists.")

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        pw_hash = hash_password(password)
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(minutes=10)).isoformat()
        created_at = now.isoformat()

        qe.execute(
            """
            INSERT INTO otp_verifications (email, name, password_hash, otp_code, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                otp_code = EXCLUDED.otp_code,
                expires_at = EXCLUDED.expires_at,
                created_at = EXCLUDED.created_at
            """,
            (normalized_email, cleaned_name, pw_hash, otp_code, expires_at, created_at),
        )

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

    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            "SELECT email, name, password_hash, otp_code, expires_at FROM otp_verifications WHERE email = ?",
            (normalized_email,),
        )

        if row is None:
            raise ValueError("No pending signup found for this email. Please request a new OTP.")

        if row["otp_code"] != clean_otp:
            raise ValueError("Invalid OTP code. Please check your email and try again.")

        expires_at_dt = datetime.fromisoformat(row["expires_at"])
        now_dt = datetime.now(timezone.utc)
        if expires_at_dt < now_dt:
            raise ValueError("OTP verification code has expired. Please click Resend OTP.")

        user_id = str(uuid.uuid4())
        created_at = now_dt.isoformat()

        qe.execute(
            "INSERT INTO users (id, email, password_hash, created_at, name) VALUES (?, ?, ?, ?, ?)",
            (user_id, normalized_email, row["password_hash"], created_at, row["name"]),
        )
        qe.execute("DELETE FROM otp_verifications WHERE email = ?", (normalized_email,))

    return {"id": user_id, "email": normalized_email, "name": row["name"], "created_at": created_at}


def resend_otp_code(email: str, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Re-generate a fresh OTP for a pending registration."""
    normalized_email = email.strip().lower()
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            "SELECT email, name, password_hash FROM otp_verifications WHERE email = ?",
            (normalized_email,),
        )

        if row is None:
            raise ValueError("No pending signup found for this email. Please enter your signup details again.")

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(minutes=10)).isoformat()

        qe.execute(
            """
            UPDATE otp_verifications
            SET otp_code = ?, expires_at = ?, created_at = ?
            WHERE email = ?
            """,
            (otp_code, expires_at, now.isoformat(), normalized_email),
        )

    return {
        "email": normalized_email,
        "name": row["name"],
        "otp_code": otp_code,
        "expires_at": expires_at,
    }


def authenticate_user(email: str, password: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Authenticate a user by email and password."""
    normalized_email = email.strip().lower()
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            "SELECT id, email, password_hash, created_at, name FROM users WHERE email = ?",
            (normalized_email,),
        )
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
    with QueryExecutor(db_path) as qe:
        qe.execute(
            "INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, created_at),
        )
    return token


def get_user_by_token(token: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Look up the authenticated user for a bearer token."""
    if not token:
        return None
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            """
            SELECT u.id, u.email, u.name, u.created_at
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = ?
            """,
            (token,),
        )
        if row is None:
            return None
        return {"id": row["id"], "email": row["email"], "name": row["name"], "created_at": row["created_at"]}


def create_session(
    session_id: str,
    topic: Optional[str] = None,
    user_id: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> str:
    """Record a new learning session."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with QueryExecutor(db_path) as qe:
        qe.execute(
            "INSERT INTO sessions (id, user_id, topic, created_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, topic, now_iso),
        )
    return now_iso


def get_session(session_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve session record by ID."""
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone("SELECT id, user_id, topic, created_at FROM sessions WHERE id = ?", (session_id,))
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
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            "SELECT p_known FROM mastery WHERE session_id = ? AND concept_id = ?",
            (session_id, concept_id),
        )
    if row:
        return float(row["p_known"])
    return None


def get_all_mastery(session_id: str, db_path: Optional[Path] = None) -> Dict[str, float]:
    """Get all concept mastery probabilities for a session."""
    with QueryExecutor(db_path) as qe:
        rows = qe.fetchall(
            "SELECT concept_id, p_known FROM mastery WHERE session_id = ?",
            (session_id,),
        )
    return {row["concept_id"]: float(row["p_known"]) for row in rows}


def set_mastery(session_id: str, concept_id: str, p_known: float, db_path: Optional[Path] = None) -> None:
    """Insert or update concept mastery probability."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with QueryExecutor(db_path) as qe:
        qe.execute(
            """
            INSERT INTO mastery (session_id, concept_id, p_known, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id, concept_id) DO UPDATE SET
                p_known = EXCLUDED.p_known,
                updated_at = EXCLUDED.updated_at
            """,
            (session_id, concept_id, p_known, now_iso),
        )


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
    with QueryExecutor(db_path) as qe:
        qe.execute(
            """
            INSERT INTO attempts (id, session_id, concept_id, question_id, correct, latency_ms, ts)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (attempt_id, session_id, concept_id, question_id, 1 if correct else 0, latency_ms, now_iso),
        )


def get_recent_attempts(
    session_id: str,
    concept_id: Optional[str] = None,
    limit: int = 10,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve recent answer attempts for a session/concept."""
    with QueryExecutor(db_path) as qe:
        if concept_id:
            rows = qe.fetchall(
                """
                SELECT id, session_id, concept_id, question_id, correct, latency_ms, ts
                FROM attempts
                WHERE session_id = ? AND concept_id = ?
                ORDER BY ts DESC LIMIT ?
                """,
                (session_id, concept_id, limit),
            )
        else:
            rows = qe.fetchall(
                """
                SELECT id, session_id, concept_id, question_id, correct, latency_ms, ts
                FROM attempts
                WHERE session_id = ?
                ORDER BY ts DESC LIMIT ?
                """,
                (session_id, limit),
            )
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
    with QueryExecutor(db_path) as qe:
        qe.execute(
            """
            INSERT INTO traces (id, session_id, step, payload_json, ts)
            VALUES (?, ?, ?, ?, ?)
            """,
            (trace_id, session_id, step, json.dumps(payload), now_iso),
        )


def get_traces(session_id: str, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Retrieve all traces for a session in order of step."""
    with QueryExecutor(db_path) as qe:
        rows = qe.fetchall(
            """
            SELECT step, payload_json, ts
            FROM traces
            WHERE session_id = ?
            ORDER BY step ASC
            """,
            (session_id,),
        )
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
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone("SELECT MAX(step) as max_step FROM traces WHERE session_id = ?", (session_id,))
    if row and row["max_step"] is not None:
        return int(row["max_step"]) + 1
    return 1


def save_questions_batch(questions: List[Dict[str, Any]], db_path: Optional[Path] = None) -> None:
    """Persist multiple questions efficiently in a single network roundtrip."""
    if not questions:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    use_pg = is_postgres(db_path)

    valid_questions = [
        q for q in questions
        if q and "id" in q and "question" in q
    ]
    if not valid_questions:
        return

    with QueryExecutor(db_path) as qe:
        if use_pg:
            from psycopg2.extras import execute_values
            query = """
                INSERT INTO questions (id, concept_id, difficulty, question, options_json, answer_index, explanation_hint, created_at)
                VALUES %s
                ON CONFLICT(id) DO UPDATE SET
                    question = EXCLUDED.question,
                    options_json = EXCLUDED.options_json,
                    answer_index = EXCLUDED.answer_index,
                    explanation_hint = EXCLUDED.explanation_hint
            """
            tuples = [
                (
                    q["id"],
                    q.get("concept", ""),
                    int(q.get("difficulty", 1)),
                    q["question"],
                    json.dumps(q.get("options", [])),
                    int(q.get("answer_index", 0)),
                    q.get("explanation_hint", ""),
                    now_iso,
                )
                for q in valid_questions
            ]
            cursor = qe.conn.cursor()
            execute_values(cursor, query, tuples)
        else:
            for q_dict in valid_questions:
                qe.execute(
                    """
                    INSERT INTO questions (id, concept_id, difficulty, question, options_json, answer_index, explanation_hint, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        question = EXCLUDED.question,
                        options_json = EXCLUDED.options_json,
                        answer_index = EXCLUDED.answer_index,
                        explanation_hint = EXCLUDED.explanation_hint
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


def save_question(q_dict: Dict[str, Any], db_path: Optional[Path] = None) -> None:
    """Persist a single question to the database."""
    if not q_dict:
        return
    save_questions_batch([q_dict], db_path=db_path)


def get_question(question_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve question record by ID."""
    with QueryExecutor(db_path) as qe:
        row = qe.fetchone(
            """
            SELECT id, concept_id, difficulty, question, options_json, answer_index, explanation_hint
            FROM questions
            WHERE id = ?
            """,
            (question_id,),
        )
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
    with QueryExecutor(db_path) as qe:
        rows = qe.fetchall(
            """
            SELECT q.id, q.concept_id, q.difficulty, q.question, q.options_json, q.answer_index, q.explanation_hint, a.correct, a.ts
            FROM attempts a
            JOIN questions q ON a.question_id = q.id
            WHERE a.session_id = ?
            ORDER BY a.ts ASC
            """,
            (session_id,),
        )
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
