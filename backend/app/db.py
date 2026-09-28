"""SQLite persistence layer for sessions, attempts, mastery states, and audit traces."""

import json
import sqlite3
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


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize database tables per MVP.md Section 3 schema."""
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                topic TEXT,
                created_at TEXT NOT NULL
            );
        """)
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
    conn.close()


def create_session(session_id: str, topic: Optional[str] = None, db_path: Optional[Path] = None) -> str:
    """Record a new learning session."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            "INSERT INTO sessions (id, topic, created_at) VALUES (?, ?, ?)",
            (session_id, topic, now_iso),
        )
    conn.close()
    return now_iso


def get_session(session_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve session record by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, topic, created_at FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "topic": row["topic"], "created_at": row["created_at"]}
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
