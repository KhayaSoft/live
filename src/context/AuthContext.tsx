import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, type UserInfo } from "@/services/api";

// ── Offline demo fallback ─────────────────────────────────────────────────────
// If the backend is unreachable, these credentials work locally so the app
// can still be demoed without running the server.
const OFFLINE_DEMO_USERS: Array<{ email: string; password: string; userId: string; displayName: string }> = [
  { email: "alex@demo.gs",   password: "demo123", userId: "demo-en",  displayName: "Alex Johnson"   },
  { email: "joao@demo.gs",   password: "demo123", userId: "demo-pt",  displayName: "João Silva"     },
  { email: "marie@demo.gs",  password: "demo123", userId: "demo-fr",  displayName: "Marie Dupont"   },
  { email: "chen@demo.gs",   password: "demo123", userId: "demo-zh",  displayName: "Chen Wei"       },
  { email: "sipho@demo.gs",  password: "demo123", userId: "demo-zu",  displayName: "Sipho Ndlovu"   },
  { email: "xiluva@demo.gs", password: "demo123", userId: "demo-xit", displayName: "Xiluva Baloyi"  },
];

const OFFLINE_TOKEN = "offline-demo-token";

function tryOfflineLogin(email: string, password: string) {
  return OFFLINE_DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  ) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("gs_token"),
    isLoading: true,
  });

  // Restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem("gs_token");
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    // Offline demo token — restore from stored user info
    if (token === OFFLINE_TOKEN) {
      const stored = localStorage.getItem("gs_user");
      if (stored) {
        try {
          const user = JSON.parse(stored) as UserInfo;
          setState({ user, token, isLoading: false });
          return;
        } catch { /* fall through */ }
      }
      localStorage.removeItem("gs_token");
      setState({ user: null, token: null, isLoading: false });
      return;
    }

    authApi
      .me()
      .then((user) => setState({ user, token, isLoading: false }))
      .catch(() => {
        localStorage.removeItem("gs_token");
        setState({ user: null, token: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem("gs_token", res.token);
      const user: UserInfo = { userId: res.userId, email, displayName: res.displayName };
      localStorage.setItem("gs_user", JSON.stringify(user));
      setState({ user, token: res.token, isLoading: false });
    } catch (err) {
      // If this is a network error (backend not running), try offline demo fallback
      const isNetworkError = err instanceof TypeError && err.message.toLowerCase().includes("fetch");
      if (isNetworkError) {
        const demo = tryOfflineLogin(email, password);
        if (demo) {
          const user: UserInfo = { userId: demo.userId, email: demo.email, displayName: demo.displayName };
          localStorage.setItem("gs_token", OFFLINE_TOKEN);
          localStorage.setItem("gs_user", JSON.stringify(user));
          setState({ user, token: OFFLINE_TOKEN, isLoading: false });
          return;
        }
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await authApi.register(email, password, displayName);
    localStorage.setItem("gs_token", res.token);
    const user: UserInfo = { userId: res.userId, email, displayName: res.displayName };
    localStorage.setItem("gs_user", JSON.stringify(user));
    setState({ user, token: res.token, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gs_token");
    localStorage.removeItem("gs_user");
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
