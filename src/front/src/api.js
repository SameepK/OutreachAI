const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export { API_BASE_URL };

// Session identity is a cookie the backend sets itself (see app.py) — every
// fetch just needs to carry it along. No API key, no client-managed auth.
export const FETCH_CREDENTIALS = "include";

// Non-sensitive form fields (never the resume text itself) remembered
// locally in the visitor's own browser so returning to the form isn't a
// blank slate. Nothing here is sent to or seen by the server.
const PROFILE_KEY = "outreachai_profile";

export async function fetchProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveProfile({ linkedin = "", github = "", sign_off = "Best regards" } = {}) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ linkedin, github, sign_off }));
  } catch {
    /* localStorage unavailable (private mode, etc.) — non-fatal */
  }
  return {};
}

export async function parseSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          /* ignore malformed */
        }
      }
    }
  }
}

export async function findMoreContacts(applicationId, department) {
  const res = await fetch(`${API_BASE_URL}/agent/find-more-contacts`, {
    method: "POST",
    credentials: FETCH_CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id: applicationId, department }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Could not find more contacts");
  return data.contacts || [];
}

export async function checkGmailStatus() {
  const res = await fetch(`${API_BASE_URL}/auth/gmail/status`, { credentials: FETCH_CREDENTIALS });
  if (!res.ok) return { connected: false };
  return res.json();
}
