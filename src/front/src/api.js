const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export { API_BASE_URL };

export function authHeaders() {
  return API_KEY ? { "X-API-Key": API_KEY } : {};
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

export async function fetchProfile() {
  const res = await fetch(`${API_BASE_URL}/user/profile`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfile(data) {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return res.json();
}

export async function clearResume() {
  const profile = await fetchProfile();
  return saveProfile({
    resume_text: "",
    resume_filename: "",
    linkedin: profile?.linkedin || "",
    github: profile?.github || "",
    sign_off: profile?.sign_off || "Best regards",
  });
}

export async function checkGmailStatus() {
  const res = await fetch(`${API_BASE_URL}/auth/gmail/status`);
  if (!res.ok) return { connected: false };
  return res.json();
}
