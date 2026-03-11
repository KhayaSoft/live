import { createContext, useContext } from "react";
import type { ChatMessage, RemotePeer } from "@/hooks/useWebRTC";

export type { ChatMessage };

export interface StreamTranslation {
  language: string;
  text: string;
  colorClass: string;
}

export interface StreamUtterance {
  id: string;
  speaker: string;
  originalText: string;
  originalLang: string;
  translations: StreamTranslation[];
  timestamp: Date;
  isLocal: boolean;
}

export interface MeetingContextValue {
  meetingId: string;
  token: string | null;
  // streams
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  // local AV state
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
  error: string | null;
  displayName: string;
  // language
  selectedLang: string;
  setSelectedLang: (lang: string) => void;
  // AV controls
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  hangUp: () => void;
  broadcastUtterance: (u: { originalText: string; originalLang: string; translations: Record<string, string> }) => void;
  // speech-to-translate
  streamUtterances: StreamUtterance[];
  interimTranscript: string;
  isListening: boolean;
  isProcessing: boolean;
  speechSupported: boolean;
  // chat
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  unreadCount: number;
  // participants
  participantsOpen: boolean;
  setParticipantsOpen: (v: boolean) => void;
}

export const MeetingContext = createContext<MeetingContextValue | null>(null);

export function useMeeting(): MeetingContextValue {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error("useMeeting must be used inside MeetingContext.Provider");
  return ctx;
}
