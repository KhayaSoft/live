import { useCallback } from "react";
import { Mic, MicOff, VideoOff } from "lucide-react";
import { useMeeting } from "@/context/MeetingContext";

// ── Local video tile ──────────────────────────────────────────────────────────
function LocalTile() {
  const { localStream, isMuted, isVideoOff, displayName } = useMeeting();

  // Callback ref — fires immediately when the <video> element mounts,
  // so the stream is attached even if localStream was set before the render.
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && localStream) {
        el.srcObject = localStream;
        el.play().catch(() => { /* autoplay policy — muted so should be fine */ });
      }
    },
    [localStream]
  );

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative rounded-lg bg-card overflow-hidden flex items-center justify-center aspect-video ring-1 ring-accent/40 shadow-[0_0_20px_hsl(162_100%_60%/0.1)]">
      {localStream && !isVideoOff ? (
        <video
          ref={videoCallbackRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xl font-semibold text-secondary-foreground">{initials}</span>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center justify-between bg-gradient-to-t from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-lang-teal" />
          <span className="text-xs font-medium text-foreground">{displayName}</span>
          <span className="text-[10px] font-mono text-accent">YOU</span>
        </div>
        <div className="flex items-center gap-1">
          {isVideoOff && <VideoOff className="w-3.5 h-3.5 text-destructive" />}
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-accent" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Remote video tile ─────────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  EN: "bg-lang-teal",
  PT: "bg-lang-blue",
  FR: "bg-lang-orange",
  ZH: "bg-lang-yellow",
  ZU: "bg-lang-purple",
  XIT: "bg-lang-pink",
};

function RemoteTile({
  peerId,
  displayName,
  language,
  stream,
  isMuted,
  isSpeaking,
}: {
  peerId: string;
  displayName: string;
  language: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isSpeaking: boolean;
}) {
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) {
        el.srcObject = stream;
        el.play().catch(() => { /* autoplay */ });
      }
    },
    [stream]
  );

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const langColor = LANG_COLORS[language] ?? "bg-muted";

  return (
    <div
      data-peerid={peerId}
      className={`relative rounded-lg bg-card overflow-hidden flex items-center justify-center aspect-video transition-shadow duration-300 ${
        isSpeaking ? "ring-1 ring-accent/50 shadow-[0_0_20px_hsl(162_100%_60%/0.1)]" : ""
      }`}
    >
      {stream ? (
        <video
          ref={videoCallbackRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xl font-semibold text-secondary-foreground">{initials}</span>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center justify-between bg-gradient-to-t from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${langColor}`} />
          <span className="text-xs font-medium text-foreground">{displayName}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{language}</span>
        </div>
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Mic className={`w-3.5 h-3.5 ${isSpeaking ? "text-accent" : "text-muted-foreground"}`} />
        )}
      </div>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────
const VideoGrid = () => {
  const { remotePeers } = useMeeting();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-2">
      <LocalTile />
      {remotePeers.map((peer) => (
        <RemoteTile
          key={peer.peerId}
          peerId={peer.peerId}
          displayName={peer.displayName}
          language={peer.language}
          stream={peer.stream}
          isMuted={peer.isMuted}
          isSpeaking={peer.isSpeaking}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
