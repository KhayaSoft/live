const express = require("express");
const bcrypt  = require("bcryptjs");
const { signToken, verifyToken } = require("../middleware/auth");
const { collection } = require("../db");

const router = express.Router();

// Persistent user store — backed by backend/data/users.json
const users = collection("users");

// ── Demo accounts (seeded once on first start) ────────────────────────────────
const DEMO_USERS = [
  { email: "alex@demo.gs",   password: "demo123", displayName: "Alex Johnson",   language: "EN"  },
  { email: "joao@demo.gs",   password: "demo123", displayName: "João Silva",     language: "PT"  },
  { email: "marie@demo.gs",  password: "demo123", displayName: "Marie Dupont",   language: "FR"  },
  { email: "chen@demo.gs",   password: "demo123", displayName: "Chen Wei",       language: "ZH"  },
  { email: "sipho@demo.gs",  password: "demo123", displayName: "Sipho Ndlovu",   language: "ZU"  },
  { email: "xiluva@demo.gs", password: "demo123", displayName: "Xiluva Baloyi",  language: "XIT" },
];

(async () => {
  for (const u of DEMO_USERS) {
    if (!users.has(u.email)) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      users.set(u.email, {
        userId:       `demo_${u.language.toLowerCase()}`,
        email:        u.email,
        displayName:  u.displayName,
        language:     u.language,
        passwordHash,
        createdAt:    new Date().toISOString(),
      });
    }
  }
  console.log("[auth] Demo users ready");
})();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "email, password, displayName required" });
  }
  if (users.has(email.toLowerCase())) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `user_${Date.now()}`;
  users.set(email.toLowerCase(), {
    userId,
    email: email.toLowerCase(),
    displayName,
    language: "EN",
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  const token = signToken({ userId, email: email.toLowerCase(), displayName });
  return res.status(201).json({ token, userId, displayName });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const user = users.get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ userId: user.userId, email: user.email, displayName: user.displayName });
  return res.json({ token, userId: user.userId, displayName: user.displayName });
});

// GET /api/auth/me  (protected)
router.get("/me", verifyToken, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email, displayName: req.user.displayName });
});

module.exports = router;
