import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// Empty string or missing means no backend — solo/demo mode
const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) || null;

export interface RemotePeer {
  peerId: string;
  userId: string;
  displayName: string;
  language: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  displayName: string;
  text: string;
  timestamp: string;
  isLocal?: boolean;
}

interface UseWebRTCOptions {
  roomId: string;
  token: string;
  displayName: string;
  language: string;
  onTranslationUtterance?: (data: {
    fromId: string;
    displayName: string;
    originalText: string;
    originalLang: string;
    translations: Record<string, string>;
  }) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN relay — helps when both peers are behind strict NAT
  { urls: "turn:openrelay.metered.ca:80",           username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443",          username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export function useWebRTC({ roomId, token, displayName, language, onTranslationUtterance }: UseWebRTCOptions) {
  const onTranslationUtteranceRef = useRef(onTranslationUtterance);
  useEffect(() => { onTranslationUtteranceRef.current = onTranslationUtterance; }, [onTranslationUtterance]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Refs to avoid stale closure in broadcastStatus
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function broadcastStatus(muted: boolean, videoOff: boolean) {
    socketRef.current?.emit("peer-status", { roomId, isMuted: muted, isVideoOff: videoOff });
  }

  function createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemotePeers((prev) =>
        prev.map((p) => (p.peerId === peerId ? { ...p, stream } : p))
      );
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", { targetId: peerId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
        peerConnsRef.current.delete(peerId);
      }
    };

    peerConnsRef.current.set(peerId, pc);
    return pc;
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function start() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setIsVideoOff(true);
          isVideoOffRef.current = true;
        } catch {
          setError("Camera/microphone access denied");
          return;
        }
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      localStreamRef.current = stream;
      cameraStreamRef.current = stream;
      setLocalStream(stream);

      // No backend URL configured → solo/demo mode, skip socket entirely
      if (!WS_URL) {
        setIsConnected(true);
        return;
      }

      const socket = io(WS_URL, {
        auth: { token },
        transports: ["polling", "websocket"],
        reconnectionAttempts: 3,
        timeout: 8000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setError(null);
        setIsConnected(true);
        socket.emit("join-room", { roomId, language });
      });
      socket.on("disconnect", () => setIsConnected(false));
      socket.on("connect_error", () => {
        // Backend unreachable — enter solo/demo mode so the UI is still usable
        setError("websocket error — running in demo mode");
        setIsConnected(true);
        socket.disconnect();
        socketRef.current = null;
      });

      // Existing peers in room → initiate offers
      socket.on("room-peers", async (peers: Array<{ peerId: string; userId: string; displayName: string; language: string }>) => {
        for (const peer of peers) {
          setRemotePeers((prev) => [
            ...prev.filter((p) => p.peerId !== peer.peerId),
            { ...peer, stream: null, isMuted: false, isVideoOff: false, isSpeaking: false },
          ]);
          const pc = createPeerConnection(peer.peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { targetId: peer.peerId, sdp: offer });
        }
      });

      // New peer joined
      socket.on("peer-joined", (peer: { peerId: string; userId: string; displayName: string; language: string }) => {
        setRemotePeers((prev) => [
          ...prev.filter((p) => p.peerId !== peer.peerId),
          { ...peer, stream: null, isMuted: false, isVideoOff: false, isSpeaking: false },
        ]);
      });

      socket.on("webrtc-offer", async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
        let pc = peerConnsRef.current.get(fromId);
        if (!pc) pc = createPeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { targetId: fromId, sdp: answer });
      });

      socket.on("webrtc-answer", async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = peerConnsRef.current.get(fromId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on("webrtc-ice-candidate", async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
        const pc = peerConnsRef.current.get(fromId);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("peer-left", ({ peerId }: { peerId: string }) => {
        peerConnsRef.current.get(peerId)?.close();
        peerConnsRef.current.delete(peerId);
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
      });

      // Remote peer mute / video state change
      socket.on("peer-status", ({ peerId, isMuted: pMuted, isVideoOff: pVideoOff }: {
        peerId: string; isMuted: boolean; isVideoOff: boolean;
      }) => {
        setRemotePeers((prev) =>
          prev.map((p) => p.peerId === peerId ? { ...p, isMuted: pMuted, isVideoOff: pVideoOff } : p)
        );
      });

      // Incoming chat messages
      socket.on("chat-message", (msg: ChatMessage) => {
        setChatMessages((prev) => [...prev, msg]);
      });

      // Incoming translation utterances → forward to caller
      socket.on("translation-utterance", (data: {
        fromId: string;
        displayName: string;
        originalText: string;
        originalLang: string;
        translations: Record<string, string>;
      }) => {
        onTranslationUtteranceRef.current?.(data);
      });
    }

    start();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      peerConnsRef.current.forEach((pc) => pc.close());
      peerConnsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  // ── Mic toggle ─────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
    broadcastStatus(next, isVideoOffRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Video toggle ───────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const next = !isVideoOffRef.current;
    isVideoOffRef.current = next;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setIsVideoOff(next);
    broadcastStatus(isMutedRef.current, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Screen share ───────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video sender track in every peer connection
      peerConnsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      // Update local stream for preview
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const newStream = new MediaStream([screenTrack, ...audioTracks]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setIsScreenSharing(true);

      // When user clicks browser's native "Stop sharing"
      screenTrack.onended = () => stopScreenShare();
    } catch {
      // User cancelled
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScreenShare = useCallback(() => {
    const camera = cameraStreamRef.current;
    if (!camera) return;

    const cameraTrack = camera.getVideoTracks()[0];
    peerConnsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
    });

    localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
    localStreamRef.current = camera;
    setLocalStream(camera);
    setIsScreenSharing(false);
  }, []);

  // ── Hang up ────────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    socketRef.current?.emit("leave-room", { roomId });
    socketRef.current?.disconnect();
    peerConnsRef.current.forEach((pc) => pc.close());
    peerConnsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemotePeers([]);
    setIsConnected(false);
  }, [roomId]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", { roomId, text: text.trim() });
  }, [roomId]);

  // ── Translation broadcast ──────────────────────────────────────────────────
  const broadcastUtterance = useCallback(
    (utterance: { originalText: string; originalLang: string; translations: Record<string, string> }) => {
      socketRef.current?.emit("translation-utterance", { roomId, utterance });
    },
    [roomId]
  );

  return {
    localStream,
    remotePeers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isConnected,
    error,
    displayName,
    chatMessages,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    hangUp,
    sendChatMessage,
    broadcastUtterance,
  };
}
