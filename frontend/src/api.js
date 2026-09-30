/**
 * Vidya Frontend API Client
 * Connects to FastAPI backend with full error handling and timeouts.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('vidya_auth_token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function signupWithEmail(email, password, name = '', confirm_password = '') {
  return fetchJson('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: name || email, email, password, confirm_password: confirm_password || password }),
  });
}

export async function requestSignupOTP({ name, email, password, confirmPassword }) {
  return fetchJson('/auth/signup/request', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password,
      confirm_password: confirmPassword,
    }),
  });
}

export async function confirmSignupOTP({ email, otp }) {
  return fetchJson('/auth/signup/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resendSignupOTP(email) {
  return fetchJson('/auth/signup/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function loginWithEmail(email, password) {
  return fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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

export async function getExplanation(sessionId, payloadOrConceptId, maybeStyle = 'default') {
  let body = {};
  if (typeof payloadOrConceptId === 'object') {
    body = {
      concept_id: payloadOrConceptId.conceptId,
      style: payloadOrConceptId.style || 'default',
      question_id: payloadOrConceptId.questionId || null,
      question_text: payloadOrConceptId.questionText || null,
      options: payloadOrConceptId.options || null,
      user_answer: payloadOrConceptId.userAnswer || null,
      correct_answer: payloadOrConceptId.correctAnswer || null,
      is_correct: payloadOrConceptId.isCorrect ?? null,
      explanation_hint: payloadOrConceptId.explanationHint || null,
    };
  } else {
    body = {
      concept_id: payloadOrConceptId,
      style: maybeStyle,
    };
  }

  return fetchJson(`/session/${sessionId}/explain`, {
    method: 'POST',
    body: JSON.stringify(body),
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
