"""Structured audit log and telemetry module for Vidya.

Ensures every decision, Bayesian update, LLM prompt attempt, and failure is recorded
for reproducible verification (MVP.md Proof #4: Trace, failures included).
"""

import uuid
from typing import Any, Dict, Optional

from backend.app.db import append_trace, get_next_trace_step


def log_event(
    session_id: str,
    action: str,
    payload: Dict[str, Any],
    error: Optional[str] = None,
    flagged: bool = False,
) -> int:
    """Record a structured audit log trace item.

    Args:
        session_id: The session UUID.
        action: Identifier for the operation (e.g., 'session_start', 'next_concept', 'answer_attempt', 'explanation_generated', 'self_rating').
        payload: Event-specific metadata (p_known, question_id, latency, etc.).
        error: Optional error description string if a failure occurred.
        flagged: Boolean flag if this step warrants special audit attention.

    Returns:
        The step sequence number assigned to this trace item.
    """
    step = get_next_trace_step(session_id)
    enriched_payload = {
        "action": action,
        **payload,
    }

    if error:
        enriched_payload["error"] = error
        enriched_payload["flagged"] = True
    elif flagged:
        enriched_payload["flagged"] = True

    append_trace(
        trace_id=str(uuid.uuid4()),
        session_id=session_id,
        step=step,
        payload=enriched_payload,
    )
    return step
