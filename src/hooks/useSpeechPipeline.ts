import { useCallback, useEffect, useRef, useState } from "react";
import { meetingsApi } from "@/services/api";
import type { StreamUtterance } from "@/context/MeetingContext";

// BCP-47 codes for the Web Speech API
const LANG_BCP47: Record<string, string> = {
  EN:  "en-US",
  PT:  "pt-PT",
  FR:  "fr-FR",
  ZH:  "zh-CN",
  ZU:  "zu-ZA",
  XIT: "pt-PT", // Changana — no native browser support, fall back to Portuguese
};

// ISO codes for Google Translate v2
const GOOGLE_LANG: Record<string, string> = {
  EN: "en", PT: "pt", FR: "fr", ZH: "zh", ZU: "zu", XIT: "ts",
};

const LANG_COLOR_CLASSES: Record<string, string> = {
  EN:  "text-lang-teal",
  PT:  "text-lang-blue",
  FR:  "text-lang-orange",
  ZH:  "text-lang-yellow",
  ZU:  "text-lang-purple",
  XIT: "text-lang-pink",
};

const ALL_LANGS = ["EN", "PT", "FR", "ZH", "ZU", "XIT"];

// Direct Google Translate call — used when backend is unreachable (demo/offline mode)
async function translateDirect(
  text: string,
  sourceLang: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const key = (import.meta.env.VITE_GOOGLE_TRANSLATE_KEY ?? "") as string;
  if (!key) throw new Error("No VITE_GOOGLE_TRANSLATE_KEY configured");
  const source = GOOGLE_LANG[sourceLang] ?? sourceLang.toLowerCase();
  const pairs = await Promise.all(
    targetLangs.map(async (lang) => {
      const target = GOOGLE_LANG[lang] ?? lang.toLowerCase();
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source, target, format: "text" }),
        }
      );
      const data = await res.json() as {
        data?: { translations?: Array<{ translatedText: string }> };
        error?: { message: string };
      };
      if (data.error) throw new Error(data.error.message);
      const translated = data.data?.translations?.[0]?.translatedText;
      if (!translated) throw new Error(`No translation for ${lang}`);
      return [lang, translated] as [string, string];
    })
  );
  return Object.fromEntries(pairs);
}

interface SpeechPipelineOptions {
  meetingId: string;
  selectedLang: string;
  displayName: string;
  isMuted: boolean;
  onUtterance: (u: StreamUtterance) => void;
  broadcastUtterance: (u: {
    originalText: string;
    originalLang: string;
    translations: Record<string, string>;
  }) => void;
}

export function useSpeechPipeline({
  meetingId,
  selectedLang,
  displayName,
  isMuted,
  onUtterance,
  broadcastUtterance,
}: SpeechPipelineOptions) {
  const [isListening, setIsListening]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const shouldListenRef = useRef(false);
  const recogRef        = useRef<SpeechRecognition | null>(null);

  // Use refs for callbacks so the recognition closure stays fresh without restarts
  const onUtteranceRef        = useRef(onUtterance);
  const broadcastUtteranceRef = useRef(broadcastUtterance);
  useEffect(() => { onUtteranceRef.current = onUtterance; }, [onUtterance]);
  useEffect(() => { broadcastUtteranceRef.current = broadcastUtterance; }, [broadcastUtterance]);

  // Check once whether the browser supports speech recognition
  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  // Translate + emit a final transcript
  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsProcessing(true);
      setInterimTranscript("");

      const targetLangs = ALL_LANGS.filter((l) => l !== selectedLang);

      let translations: Record<string, string>;
      try {
        // 1st choice: backend proxy (also handles auth / rate limiting)
        const result = await meetingsApi.translate(meetingId, text, selectedLang, targetLangs);
        translations = result.translations;
      } catch {
        try {
          // 2nd choice: call Google Translate directly from the browser
          translations = await translateDirect(text, selectedLang, targetLangs);
        } catch {
          // Last resort: labelled stub so the user can see something
          translations = Object.fromEntries(targetLangs.map((l) => [l, `[${l}] ${text}`]));
        }
      }

      const utterance: StreamUtterance = {
        id: `local-${Date.now()}`,
        speaker: displayName,
        originalText: text,
        originalLang: selectedLang,
        translations: targetLangs.map((lang) => ({
          language: lang,
          text: translations[lang] ?? `[${lang}] ${text}`,
          colorClass: LANG_COLOR_CLASSES[lang] ?? "text-foreground",
        })),
        timestamp: new Date(),
        isLocal: true,
      };

      onUtteranceRef.current(utterance);
      broadcastUtteranceRef.current({ originalText: text, originalLang: selectedLang, translations });

      setIsProcessing(false);
    },
    [meetingId, selectedLang, displayName]
  );

  // Start / stop / restart speech recognition whenever language or mute changes
  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (!SR || isMuted) {
      shouldListenRef.current = false;
      recogRef.current?.stop();
      recogRef.current = null;
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    shouldListenRef.current = true;

    const recog = new SR();
    recog.continuous      = true;
    recog.interimResults  = true;
    recog.lang            = LANG_BCP47[selectedLang] ?? "en-US";
    recogRef.current      = recog;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          processTranscript(r[0].transcript);
        } else {
          interim += r[0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") return; // normal silence — ignore
      console.warn("[speech]", e.error);
      if (e.error === "not-allowed" || e.error === "audio-capture") {
        // Mic permission denied — stop trying
        shouldListenRef.current = false;
        setIsListening(false);
        setSpeechSupported(false);
      }
    };

    // Auto-restart on end (keeps recognition alive for the whole call)
    recog.onend = () => {
      if (shouldListenRef.current && recogRef.current === recog) {
        try { recog.start(); } catch { /* already started */ }
      } else {
        setIsListening(false);
      }
    };

    try {
      recog.start();
      setIsListening(true);
    } catch { /* already started */ }

    return () => {
      shouldListenRef.current = false;
      recogRef.current = null;
      try { recog.stop(); } catch { /* already stopped */ }
      setIsListening(false);
      setInterimTranscript("");
    };
  }, [selectedLang, isMuted, processTranscript]);

  return { isListening, isProcessing, interimTranscript, speechSupported };
}
