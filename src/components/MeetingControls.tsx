import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Users, MessageSquare, Globe, PhoneOff, Loader2 } from "lucide-react";
import { useMeeting } from "@/context/MeetingContext";
import { useMeetingTimer } from "@/hooks/useMeetingTimer";

const LANGUAGES = ["EN", "PT", "FR", "ZH", "ZU", "XIT"];

const MeetingControls = () => {
  const {
    isMuted,
    isVideoOff,
    isScreenSharing,
    isConnected,
    selectedLang,
    setSelectedLang,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    hangUp,
    meetingId,
    setChatOpen,
    chatOpen,
    unreadCount,
    participantsOpen,
    setParticipantsOpen,
    remotePeers,
    isListening,
    isProcessing,
  } = useMeeting();
  const elapsed = useMeetingTimer();
  const totalParticipants = remotePeers.length + 1;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-surface-elevated border-t border-border">
      {/* Left: meeting info */}
      <div className="hidden sm:flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-accent animate-pulse-glow" : "bg-muted-foreground"
          }`}
        />
        <span className="text-xs font-mono text-muted-foreground">
          {isConnected ? `LIVE · ${elapsed}` : "CONNECTING…"}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase hidden md:block">
          {meetingId}
        </span>
        {/* Speech indicator */}
        {isProcessing && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hidden md:flex">
            <Loader2 className="w-3 h-3 animate-spin text-accent" />
            translating
          </span>
        )}
        {isListening && !isProcessing && !isMuted && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-accent hidden md:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            listening
          </span>
        )}
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-2">

        {/* Mute */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? "bg-destructive/20 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            isVideoOff ? "bg-destructive/20 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen share */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? "bg-accent/20 text-accent ring-1 ring-accent/40" : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Participants */}
        <button
          onClick={() => { setParticipantsOpen(!participantsOpen); setChatOpen(false); }}
          title="Participants"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            participantsOpen ? "bg-accent/20 text-accent ring-1 ring-accent/40" : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          <Users className="w-5 h-5" />
          {totalParticipants > 1 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
              {totalParticipants > 9 ? "9+" : totalParticipants}
            </span>
          )}
        </button>

        {/* Chat */}
        <button
          onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }}
          title="Chat"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            chatOpen ? "bg-accent/20 text-accent ring-1 ring-accent/40" : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Language selector */}
        <div className="flex items-center gap-1 ml-2 px-3 py-1.5 rounded-full bg-muted">
          <Globe className="w-4 h-4 text-accent mr-1" />
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors ${
                selectedLang === lang
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Hang up */}
        <button
          onClick={hangUp}
          title="Leave meeting"
          className="w-11 h-11 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors ml-2"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Right: spacer */}
      <div className="hidden sm:block w-24" />
    </div>
  );
};

export default MeetingControls;
