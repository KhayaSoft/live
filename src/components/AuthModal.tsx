import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

const registerSchema = loginSchema.extend({
  displayName: z.string().min(2, "Min 2 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ── Demo accounts ─────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: "alex@demo.gs",   password: "demo123", displayName: "Alex Johnson",   language: "EN", langColor: "bg-lang-teal",   textColor: "text-lang-teal"   },
  { email: "joao@demo.gs",   password: "demo123", displayName: "João Silva",     language: "PT", langColor: "bg-lang-blue",   textColor: "text-lang-blue"   },
  { email: "marie@demo.gs",  password: "demo123", displayName: "Marie Dupont",   language: "FR", langColor: "bg-lang-orange", textColor: "text-lang-orange" },
  { email: "chen@demo.gs",   password: "demo123", displayName: "Chen Wei",       language: "ZH", langColor: "bg-lang-yellow", textColor: "text-lang-yellow" },
  { email: "sipho@demo.gs",  password: "demo123", displayName: "Sipho Ndlovu",  language: "ZU", langColor: "bg-lang-purple", textColor: "text-lang-purple" },
  { email: "xiluva@demo.gs", password: "demo123", displayName: "Xiluva Baloyi", language: "XIT", langColor: "bg-lang-pink",   textColor: "text-lang-pink"   },
];

export default function AuthModal() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function handleLogin(data: LoginForm) {
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function handleRegister(data: RegisterForm) {
    setError(null);
    try {
      await register(data.email, data.password, data.displayName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  }

  async function handleDemoLogin(email: string, password: string) {
    setError(null);
    setDemoLoading(email);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo login failed");
    } finally {
      setDemoLoading(null);
    }
  }

  function fillDemoCredentials(email: string, password: string) {
    loginForm.setValue("email", email);
    loginForm.setValue("password", password);
    setMode("login");
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition";
  const btnClass =
    "w-full py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition disabled:opacity-50";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <Globe className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Ocular<span className="text-accent">Sound</span>
        </h1>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* ── Demo accounts panel ── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-4">
            Demo accounts — click to sign in instantly
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => handleDemoLogin(u.email, u.password)}
                disabled={demoLoading !== null}
                className="group relative flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl bg-muted hover:bg-muted/70 border border-border hover:border-accent/20 transition disabled:opacity-50 text-left"
              >
                {/* Language dot + code */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${u.langColor} shrink-0`} />
                  <span className={`text-[10px] font-mono font-semibold ${u.textColor}`}>
                    {u.language}
                  </span>
                </div>

                {/* Name */}
                <span className="text-xs font-medium text-foreground leading-tight">
                  {u.displayName}
                </span>

                {/* Email */}
                <span className="text-[10px] font-mono text-muted-foreground truncate w-full">
                  {u.email}
                </span>

                {/* Loading spinner overlay */}
                {demoLoading === u.email && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            All demo accounts use password{" "}
            <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">demo123</span>
          </p>
        </div>

        {/* ── Login / Register form ── */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "login" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "register" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Register
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <input {...loginForm.register("email")} placeholder="Email" className={inputClass} />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <input {...loginForm.register("password")} type="password" placeholder="Password" className={inputClass} />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <button type="submit" disabled={loginForm.formState.isSubmitting} className={btnClass}>
                {loginForm.formState.isSubmitting ? "Signing in…" : "Sign in"}
              </button>

              {/* Quick-fill links */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground self-center">Quick fill:</span>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => fillDemoCredentials(u.email, u.password)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border border-border hover:border-accent/40 ${u.textColor} transition`}
                  >
                    {u.language}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div>
                <input {...registerForm.register("displayName")} placeholder="Display name" className={inputClass} />
                {registerForm.formState.errors.displayName && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.displayName.message}</p>
                )}
              </div>
              <div>
                <input {...registerForm.register("email")} placeholder="Email" className={inputClass} />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <input {...registerForm.register("password")} type="password" placeholder="Password" className={inputClass} />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <button type="submit" disabled={registerForm.formState.isSubmitting} className={btnClass}>
                {registerForm.formState.isSubmitting ? "Creating…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
