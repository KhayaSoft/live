import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { meetingsApi } from "@/services/api";

export default function Join() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setError(null);
    setIsLoading(true);
    try {
      // Validate that the meeting exists
      await meetingsApi.get(trimmed);
      // Record the user as a participant (best-effort)
      await meetingsApi.join(trimmed).catch(() => {});
      navigate(`/meeting/${trimmed}`);
    } catch (err) {
      // Meeting not in DB (offline-created code, old Render code, etc.) — join anyway.
      // The meeting code is just a Socket.io room ID; it doesn't need to be pre-registered.
      const msg = err instanceof Error ? err.message : "";
      const isNetworkError = err instanceof TypeError && msg.toLowerCase().includes("fetch");
      if (isNetworkError || msg === "Meeting not found") {
        navigate(`/meeting/${trimmed}`);
        return;
      }
      setError(msg || "Meeting not found");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <LogIn className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Join Meeting</h1>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground tracking-widest uppercase mb-2">
              Meeting Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3F7B2C1"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-center text-xl font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent transition uppercase"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || code.trim().length < 6}
            className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition disabled:opacity-40"
          >
            {isLoading ? "Joining…" : "Join Meeting"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Ask the meeting host for the 8-character code.
        </p>
      </div>
    </div>
  );
}
