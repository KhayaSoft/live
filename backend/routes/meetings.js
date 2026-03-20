const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../middleware/auth");
const { collection } = require("../db");

const router = express.Router();

// Persistent meeting store — backed by backend/data/meetings.json
const meetings = collection("meetings");

// POST /api/meetings  — create a new meeting
router.post("/", verifyToken, (req, res) => {
  const { title, language } = req.body;
  const meetingId = uuidv4().slice(0, 8).toUpperCase(); // e.g. "A3F7B2C1"
  const meeting = {
    meetingId,
    title: title || "Meeting",
    hostId: req.user.userId,
    hostName: req.user.displayName,
    language: language || "EN",
    createdAt: new Date().toISOString(),
    endedAt: null,
    participants: [],
  };
  meetings.set(meetingId, meeting);
  return res.status(201).json(meeting);
});

// GET /api/meetings/:meetingId  — get meeting details (validates code)
router.get("/:meetingId", (req, res) => {
  const meeting = meetings.get(req.params.meetingId.toUpperCase());
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  return res.json(meeting);
});

// GET /api/meetings  — list meetings the user hosted or attended
router.get("/", verifyToken, (req, res) => {
  const userId = req.user.userId;
  const userMeetings = [...meetings.values()]
    .filter(
      (m) =>
        m.hostId === userId ||
        m.participants.some((p) => p.userId === userId)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(userMeetings);
});

// PATCH /api/meetings/:meetingId/end  — end a meeting
router.patch("/:meetingId/end", verifyToken, (req, res) => {
  const meeting = meetings.get(req.params.meetingId.toUpperCase());
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.hostId !== req.user.userId)
    return res.status(403).json({ error: "Only the host can end the meeting" });
  meeting.endedAt = new Date().toISOString();
  meetings.set(meeting.meetingId, meeting); // persist the change
  return res.json(meeting);
});

// POST /api/meetings/:meetingId/join — record a participant joining
router.post("/:meetingId/join", verifyToken, (req, res) => {
  const meeting = meetings.get(req.params.meetingId.toUpperCase());
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.endedAt) return res.status(410).json({ error: "Meeting has ended" });

  const alreadyIn = meeting.participants.some((p) => p.userId === req.user.userId);
  if (!alreadyIn) {
    meeting.participants.push({
      userId: req.user.userId,
      displayName: req.user.displayName,
      joinedAt: new Date().toISOString(),
    });
    meetings.set(meeting.meetingId, meeting); // persist the change
  }
  return res.json(meeting);
});

// ISO 639-1 codes
const LANG_ISO = { EN: "en", PT: "pt", FR: "fr", ZH: "zh", RU: "ru", DE: "de" };

async function translateOne(text, srcCode, tgtCode) {
  const src = LANG_ISO[srcCode.toUpperCase()] || srcCode.toLowerCase();
  const tgt = LANG_ISO[tgtCode.toUpperCase()] || tgtCode.toLowerCase();

  // 1st choice: Google Translate (if API key configured)
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: src, target: tgt, format: "text" }) }
      );
      const data = await res.json();
      if (!data.error) {
        const t = data.data?.translations?.[0]?.translatedText;
        if (t) return t;
      }
    } catch { /* fall through */ }
  }

  // 2nd choice: MyMemory (free, no key required)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error(`Translation failed for ${tgtCode}: ${data.responseDetails || "unknown error"}`);
}

// POST /api/meetings/:meetingId/translate  — proxy translation request
router.post("/:meetingId/translate", verifyToken, async (req, res) => {
  const { text, sourceLang, targetLangs } = req.body;
  if (!text || !sourceLang || !targetLangs?.length) {
    return res.status(400).json({ error: "text, sourceLang, targetLangs required" });
  }

  try {
    const results = await Promise.all(
      targetLangs.map(async (lang) => {
        try {
          const translated = await translateOne(text, sourceLang, lang);
          return [lang, translated];
        } catch (err) {
          console.error("[translate]", err.message);
          return [lang, `[${lang}] ${text}`]; // stub fallback per language
        }
      })
    );
    return res.json({ translations: Object.fromEntries(results) });
  } catch (err) {
    console.error("[translate]", err);
    return res.status(502).json({ error: "Translation service unavailable" });
  }
});

module.exports = router;
