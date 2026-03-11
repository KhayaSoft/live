import { useEffect, useRef, useState } from "react";
import { useMeeting } from "@/context/MeetingContext";
import type { StreamUtterance } from "@/context/MeetingContext";

// ── Single translation block ──────────────────────────────────────────────────
const LogogramBlock = ({
  utterance,
  selectedLang,
  isNew,
}: {
  utterance: StreamUtterance;
  selectedLang: string;
  isNew: boolean;
}) => {
  const sorted = [...utterance.translations].sort((a, b) => {
    if (a.language === selectedLang) return -1;
    if (b.language === selectedLang) return 1;
    return 0;
  });

  return (
    <div
      className={`flex-shrink-0 w-72 px-6 py-4 relative border-r border-border/30 ${
        isNew ? "animate-fade-in-up" : ""
      } ${utterance.isLocal ? "border-l-2 border-accent/40" : ""}`}
    >
      <div className="absolute left-0 top-1/2 w-full h-px bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />

      {/* Speaker + local badge */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
          {utterance.speaker}
        </p>
        {utterance.isLocal && (
          <span className="text-[9px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
            YOU
          </span>
        )}
      </div>

      {/* Original */}
      <p className="font-mono text-sm text-foreground leading-relaxed mb-3">
        {utterance.originalText}
      </p>

      <div className="h-px w-full bg-accent/30 animate-pulse-glow mb-3" />

      {/* Translations */}
      <div className="space-y-1.5">
        {sorted.map((t) => {
          const isSelected = t.language === selectedLang;
          return (
            <div
              key={t.language}
              className={`flex items-start gap-2 transition-all duration-300 ${
                isSelected ? "scale-[1.02] origin-left" : "opacity-50"
              }`}
            >
              <span className={`text-[10px] font-mono font-bold ${t.colorClass} shrink-0 mt-0.5`}>
                {t.language}
              </span>
              <p
                className={`font-mono ${t.colorClass} leading-relaxed ${
                  isSelected ? "text-sm font-medium opacity-100" : "text-xs opacity-70"
                }`}
              >
                {t.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Stream ────────────────────────────────────────────────────────────────────
const LogogramStream = () => {
  const {
    streamUtterances,
    interimTranscript,
    isListening,
    isProcessing,
    selectedLang,
    displayName,
    speechSupported,
  } = useMeeting();

  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(streamUtterances.length);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Auto-scroll right whenever a new utterance arrives
  useEffect(() => {
    if (streamUtterances.length > prevLenRef.current) {
      const latest = streamUtterances[streamUtterances.length - 1];

      // Trigger entrance animation for newest block
      setNewIds((ids) => new Set([...ids, latest.id]));
      setTimeout(() => {
        setNewIds((ids) => {
          const next = new Set(ids);
          next.delete(latest.id);
          return next;
        });
      }, 600);

      // Scroll to end unless user paused
      if (!isPaused && scrollRef.current) {
        scrollRef.current.scrollTo({
          left: scrollRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }
    prevLenRef.current = streamUtterances.length;
  }, [streamUtterances.length, isPaused]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">

      {/* ── Fade edges ── */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* ── Top-left: selected-language badge + speech status ── */}
      <div className="absolute top-2 left-6 z-10 flex items-center gap-2">
        <span className="text-[9px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full tracking-widest uppercase">
          {selectedLang} highlighted
        </span>
        {isListening && !isProcessing && (
          <span className="flex items-center gap-1 text-[9px] font-mono text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            listening
          </span>
        )}
        {isProcessing && (
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span className="w-3 h-3 rounded-full border border-accent border-t-transparent animate-spin" />
            translating…
          </span>
        )}
        {!speechSupported && (
          <span className="text-[9px] font-mono text-destructive/70">
            (speech not supported in this browser)
          </span>
        )}
      </div>

      {/* ── Scrollable blocks (left = oldest, right = newest) ── */}
      <div
        ref={scrollRef}
        className="flex items-center h-full overflow-x-auto overflow-y-hidden cursor-pointer"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        onClick={() => setIsPaused((p) => !p)}
      >
        {streamUtterances.map((u) => (
          <LogogramBlock
            key={u.id}
            utterance={u}
            selectedLang={selectedLang}
            isNew={newIds.has(u.id)}
          />
        ))}
        {/* Trailing spacer so the last block clears the right fade */}
        <div className="flex-shrink-0 w-24" />
      </div>

      {/* ── Bottom: live interim transcript + pause hint ── */}
      <div className="absolute bottom-0 inset-x-0 px-6 py-2 flex items-end justify-between z-10 pointer-events-none">
        {/* Interim speech bubble */}
        {interimTranscript ? (
          <div className="flex items-center gap-2 max-w-lg bg-background/80 border border-accent/20 rounded-full px-4 py-1.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="text-xs font-mono text-accent/90 truncate">{displayName}:</span>
            <span className="text-xs font-mono text-foreground truncate italic">{interimTranscript}</span>
          </div>
        ) : (
          <div />
        )}

        {isPaused && (
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
            paused · click to resume
          </span>
        )}
      </div>
    </div>
  );
};

export default LogogramStream;
