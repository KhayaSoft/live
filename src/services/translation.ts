import { meetingsApi } from "./api";

export interface TranslationResult {
  language: string;
  text: string;
  colorClass: string;
}

const LANG_COLOR_CLASSES: Record<string, string> = {
  EN: "text-lang-teal",
  PT: "text-lang-blue",
  FR: "text-lang-orange",
  ZH: "text-lang-yellow",
  ZU: "text-lang-purple",
  XIT: "text-lang-pink",
};

/**
 * Translate `text` from `sourceLang` into all other supported languages
 * via the backend API. Falls back to prefixed stub if the API is unavailable.
 */
export async function translateUtterance(
  meetingId: string,
  text: string,
  sourceLang: string,
  allLangs: string[]
): Promise<TranslationResult[]> {
  const targetLangs = allLangs.filter((l) => l !== sourceLang);
  if (targetLangs.length === 0) return [];

  try {
    const { translations } = await meetingsApi.translate(
      meetingId,
      text,
      sourceLang,
      targetLangs
    );
    return targetLangs.map((lang) => ({
      language: lang,
      text: translations[lang] ?? text,
      colorClass: LANG_COLOR_CLASSES[lang] ?? "text-foreground",
    }));
  } catch {
    // Stub fallback when backend is offline
    return targetLangs.map((lang) => ({
      language: lang,
      text: `[${lang}] ${text}`,
      colorClass: LANG_COLOR_CLASSES[lang] ?? "text-foreground",
    }));
  }
}

export { LANG_COLOR_CLASSES };
