import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoGrid from "@/components/VideoGrid";
import LogogramStream from "@/components/LogogramStream";
import MeetingControls from "@/components/MeetingControls";
import ChatPanel from "@/components/ChatPanel";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSpeechPipeline } from "@/hooks/useSpeechPipeline";
import { useAuth } from "@/context/AuthContext";
import { MeetingContext, type StreamUtterance } from "@/context/MeetingContext";
import { LANG_COLOR_CLASSES } from "@/services/translation";

// ── Demo utterances shown before anyone speaks ────────────────────────────────
const DEMO_UTTERANCES: StreamUtterance[] = [
  {
    id: "demo-1", speaker: "João", originalText: "Vamos começar a reunião.", originalLang: "PT",
    translations: [
      { language: "EN",  text: "Let's start the meeting.",       colorClass: "text-lang-teal"   },
      { language: "FR",  text: "Commençons la réunion.",         colorClass: "text-lang-orange" },
      { language: "ZU",  text: "Masiqale umhlangano.",           colorClass: "text-lang-purple" },
    ],
    timestamp: new Date(), isLocal: false,
  },
  {
    id: "demo-2", speaker: "Marie", originalText: "Bonjour à tous, merci d'être là.", originalLang: "FR",
    translations: [
      { language: "EN", text: "Hello everyone, thanks for being here.",      colorClass: "text-lang-teal"   },
      { language: "PT", text: "Olá a todos, obrigado por estarem aqui.",     colorClass: "text-lang-blue"   },
      { language: "ZU", text: "Sanibonani nonke, ngiyabonga ngokuba lapha.", colorClass: "text-lang-purple" },
    ],
    timestamp: new Date(), isLocal: false,
  },
  {
    id: "demo-3", speaker: "Chen", originalText: "我已经准备好了今天的报告。", originalLang: "ZH",
    translations: [
      { language: "EN", text: "I have prepared today's report.",        colorClass: "text-lang-teal"   },
      { language: "FR", text: "J'ai préparé le rapport d'aujourd'hui.", colorClass: "text-lang-orange" },
      { language: "PT", text: "Eu preparei o relatório de hoje.",       colorClass: "text-lang-blue"   },
    ],
    timestamp: new Date(), isLocal: false,
  },
  {
    id: "demo-4", speaker: "Sipho", originalText: "Ngicela ukwabelana ngombono wami.", originalLang: "ZU",
    translations: [
      { language: "EN", text: "I would like to share my opinion.",       colorClass: "text-lang-teal"   },
      { language: "FR", text: "J'aimerais partager mon avis.",           colorClass: "text-lang-orange" },
      { language: "PT", text: "Gostaria de compartilhar minha opinião.", colorClass: "text-lang-blue"   },
    ],
    timestamp: new Date(), isLocal: false,
  },
  {
    id: "demo-5", speaker: "João", originalText: "Excelente, vamos ouvir todas as perspetivas.", originalLang: "PT",
    translations: [
      { language: "EN", text: "Excellent, let's hear all perspectives.",      colorClass: "text-lang-teal"   },
      { language: "FR", text: "Excellent, écoutons toutes les perspectives.", colorClass: "text-lang-orange" },
      { language: "ZU", text: "Kuhle, masilalele zonke izindlela zokubona.", colorClass: "text-lang-purple" },
    ],
    timestamp: new Date(), isLocal: false,
  },
];

const Meeting = () => {
  const { meetingId = "local" } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [selectedLang, setSelectedLang] = useState("EN");
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streamUtterances, setStreamUtterances] = useState<StreamUtterance[]>(DEMO_UTTERANCES);
  const prevChatLenRef = useRef(0);

  // Shared handler: adds utterances from both local speech and remote peers
  const addUtterance = useCallback((u: StreamUtterance) => {
    setStreamUtterances((prev) => [...prev, u].slice(-30));
  }, []);

  // Convert incoming socket payload → StreamUtterance and add it
  const handleRemoteUtterance = useCallback(
    (data: {
      fromId: string;
      displayName: string;
      originalText: string;
      originalLang: string;
      translations: Record<string, string>;
    }) => {
      addUtterance({
        id: `remote-${data.fromId}-${Date.now()}`,
        speaker: data.displayName,
        originalText: data.originalText,
        originalLang: data.originalLang,
        translations: Object.entries(data.translations).map(([lang, text]) => ({
          language: lang,
          text,
          colorClass: LANG_COLOR_CLASSES[lang] ?? "text-foreground",
        })),
        timestamp: new Date(),
        isLocal: false,
      });
    },
    [addUtterance]
  );

  const webrtc = useWebRTC({
    roomId: meetingId,
    token: token ?? "",
    displayName: user?.displayName ?? "Guest",
    language: selectedLang,
    onTranslationUtterance: handleRemoteUtterance,
  });

  // Speech → translate → stream pipeline (auto-starts when not muted)
  const speech = useSpeechPipeline({
    meetingId,
    selectedLang,
    displayName: user?.displayName ?? "Guest",
    isMuted: webrtc.isMuted,
    onUtterance: addUtterance,
    broadcastUtterance: webrtc.broadcastUtterance,
  });

  // Unread chat badge
  useEffect(() => {
    const newLen = webrtc.chatMessages.length;
    if (!chatOpen && newLen > prevChatLenRef.current) {
      setUnreadCount((c) => c + (newLen - prevChatLenRef.current));
    }
    prevChatLenRef.current = newLen;
  }, [webrtc.chatMessages.length, chatOpen]);

  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  function handleHangUp() {
    webrtc.hangUp();
    navigate("/");
  }

  return (
    <MeetingContext.Provider
      value={{
        meetingId,
        token: token ?? null,
        localStream: webrtc.localStream,
        remotePeers: webrtc.remotePeers,
        isMuted: webrtc.isMuted,
        isVideoOff: webrtc.isVideoOff,
        isScreenSharing: webrtc.isScreenSharing,
        isConnected: webrtc.isConnected,
        error: webrtc.error,
        displayName: webrtc.displayName,
        selectedLang,
        setSelectedLang,
        toggleMute: webrtc.toggleMute,
        toggleVideo: webrtc.toggleVideo,
        startScreenShare: webrtc.startScreenShare,
        stopScreenShare: webrtc.stopScreenShare,
        hangUp: handleHangUp,
        broadcastUtterance: webrtc.broadcastUtterance,
        streamUtterances,
        interimTranscript: speech.interimTranscript,
        isListening: speech.isListening,
        isProcessing: speech.isProcessing,
        speechSupported: speech.speechSupported,
        chatMessages: webrtc.chatMessages,
        sendChatMessage: webrtc.sendChatMessage,
        chatOpen,
        setChatOpen,
        unreadCount,
        participantsOpen,
        setParticipantsOpen,
      }}
    >
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {webrtc.error && !webrtc.error.includes("demo mode") && (
          <div className="flex-shrink-0 px-4 py-2 bg-destructive/10 text-destructive text-xs text-center font-mono">
            {webrtc.error}
          </div>
        )}
        <div className="flex-shrink-0"><VideoGrid /></div>
        <div className="flex-1 min-h-0 border-y border-border relative"><LogogramStream /></div>
        <div className="flex-shrink-0"><MeetingControls /></div>
      </div>
      <ChatPanel />
      <ParticipantsPanel />
    </MeetingContext.Provider>
  );
};

export default Meeting;
