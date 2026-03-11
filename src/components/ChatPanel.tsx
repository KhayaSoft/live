import { useEffect, useRef, useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { useMeeting } from "@/context/MeetingContext";
import { useAuth } from "@/context/AuthContext";

const LANG_COLORS: Record<string, string> = {
  EN: "text-lang-teal",
  PT: "text-lang-blue",
  FR: "text-lang-orange",
  ZH: "text-lang-yellow",
  ZU: "text-lang-purple",
  XIT: "text-lang-pink",
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export default function ChatPanel() {
  const { chatMessages, sendChatMessage, chatOpen, setChatOpen } = useMeeting();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendChatMessage(draft);
    setDraft("");
  }

  if (!chatOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border flex flex-col z-50 shadow-2xl animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Chat</h2>
          {chatMessages.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ({chatMessages.length})
            </span>
          )}
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Say hello!</p>
          </div>
        )}

        {chatMessages.map((msg) => {
          const isOwn = msg.fromId === (user?.userId ?? "");
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
              {/* Sender + time */}
              <div className="flex items-center gap-2">
                {!isOwn && (
                  <span className={`text-[10px] font-mono font-semibold ${LANG_COLORS["EN"]}`}>
                    {msg.displayName}
                  </span>
                )}
                <span className="text-[9px] font-mono text-muted-foreground/50">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              {/* Bubble */}
              <div
                className={`max-w-[220px] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  isOwn
                    ? "bg-accent text-accent-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
