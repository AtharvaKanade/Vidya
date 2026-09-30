/**
 * Vidya Frontend API Client
 * Connects to FastAPI backend with full error handling and timeouts.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Request failed [${endpoint}]:`, err);
    throw err;
  }
}

export async function checkHealth() {
  return fetchJson('/health');
}

export async function startSession(topic = null) {
  const payload = topic ? { topic } : {};
  return fetchJson('/session/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getNextConcept(sessionId) {
  return fetchJson(`/session/${sessionId}/next`);
}

export async function submitAnswer(sessionId, { conceptId, questionId, correct, latencyMs = 0 }) {
  return fetchJson(`/session/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      concept_id: conceptId,
      question_id: questionId,
      correct,
      latency_ms: latencyMs,
    }),
  });
}

export async function getExplanation(sessionId, conceptId, style = 'default') {
  return fetchJson(`/session/${sessionId}/explain`, {
    method: 'POST',
    body: JSON.stringify({
      concept_id: conceptId,
      style,
    }),
  });
}

export async function submitSelfRating(sessionId, conceptId, rating) {
  return fetchJson(`/session/${sessionId}/self-rate`, {
    method: 'POST',
    body: JSON.stringify({
      concept_id: conceptId,
      rating: parseInt(rating, 10),
    }),
  });
}

export async function getMastery(sessionId) {
  return fetchJson(`/session/${sessionId}/mastery`);
}

export async function getTraces(sessionId) {
  return fetchJson(`/session/${sessionId}/trace`);
}
