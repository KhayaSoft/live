import { useState } from "react";
import { X, Users, Mic, MicOff, Video, VideoOff, Copy, Check } from "lucide-react";
import { useMeeting } from "@/context/MeetingContext";
import { useAuth } from "@/context/AuthContext";

const LANG_DOT: Record<string, string> = {
  EN: "bg-lang-teal",
  PT: "bg-lang-blue",
  FR: "bg-lang-orange",
  ZH: "bg-lang-yellow",
  ZU: "bg-lang-purple",
  XIT: "bg-lang-pink",
};

function ParticipantRow({
  name,
  language,
  isMuted,
  isVideoOff,
  isYou,
}: {
  name: string;
  language: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isYou: boolean;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dotColor = LANG_DOT[language] ?? "bg-muted-foreground";

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-secondary-foreground">{initials}</span>
      </div>

      {/* Name + language */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          {isYou && (
            <span className="text-[9px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
              YOU
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[10px] font-mono text-muted-foreground">{language}</span>
        </div>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isVideoOff ? (
          <VideoOff className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Video className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Mic className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export default function ParticipantsPanel() {
  const { participantsOpen, setParticipantsOpen, remotePeers, isMuted, isVideoOff, displayName, selectedLang, meetingId } = useMeeting();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!participantsOpen) return null;

  const total = remotePeers.length + 1;

  const joinUrl = `${window.location.origin}/meeting/${meetingId}`;

  function copyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed top-0 right-0 h-full w-72 bg-card border-l border-border flex flex-col z-50 shadow-2xl animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Participants</h2>
          <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
            {total}
          </span>
        </div>
        <button
          onClick={() => setParticipantsOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meeting invite */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">
          Invite Link
        </p>
        <div className="flex items-center gap-2 mb-2">
          <code className="flex-1 text-[11px] font-mono text-foreground bg-muted px-3 py-1.5 rounded-lg truncate">
            {joinUrl}
          </code>
          <button
            onClick={copyLink}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition flex-shrink-0"
            title="Copy invite link"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-0.5">
          Meeting Code
        </p>
        <p className="text-lg font-mono font-bold text-accent tracking-widest">{meetingId}</p>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0 divide-y divide-border">
        {/* Local user */}
        <ParticipantRow
          name={displayName}
          language={user ? selectedLang : "EN"}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isYou
        />

        {/* Remote peers */}
        {remotePeers.map((peer) => (
          <ParticipantRow
            key={peer.peerId}
            name={peer.displayName}
            language={peer.language}
            isMuted={peer.isMuted}
            isVideoOff={peer.isVideoOff}
            isYou={false}
          />
        ))}
      </div>
    </div>
  );
}
