const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("gs_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  userId: string;
  displayName: string;
}

export interface UserInfo {
  userId: string;
  email: string;
  displayName: string;
}

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>("POST", "/api/auth/register", { email, password, displayName }, false),
  login: (email: string, password: string) =>
    request<AuthResponse>("POST", "/api/auth/login", { email, password }, false),
  me: () => request<UserInfo>("GET", "/api/auth/me"),
};

// ── Meetings ─────────────────────────────────────────────────────────────────
export interface Meeting {
  meetingId: string;
  title: string;
  hostId: string;
  hostName: string;
  language: string;
  createdAt: string;
  endedAt: string | null;
  participants: Array<{ userId: string; displayName: string; joinedAt: string }>;
}

export const meetingsApi = {
  create: (title: string, language: string) =>
    request<Meeting>("POST", "/api/meetings", { title, language }),
  get: (meetingId: string) =>
    request<Meeting>("GET", `/api/meetings/${meetingId}`, undefined, false),
  list: () => request<Meeting[]>("GET", "/api/meetings"),
  join: (meetingId: string) =>
    request<Meeting>("POST", `/api/meetings/${meetingId}/join`),
  end: (meetingId: string) =>
    request<Meeting>("PATCH", `/api/meetings/${meetingId}/end`),
  translate: (
    meetingId: string,
    text: string,
    sourceLang: string,
    targetLangs: string[]
  ) =>
    request<{ translations: Record<string, string> }>(
      "POST",
      `/api/meetings/${meetingId}/translate`,
      { text, sourceLang, targetLangs }
    ),
};
