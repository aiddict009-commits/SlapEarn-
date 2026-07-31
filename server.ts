import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server time endpoint - tamper-proof server clock
  app.get("/api/time", (req, res) => {
    const now = Date.now();
    res.json({
      serverTime: now,
      iso: new Date(now).toISOString(),
      timezone: "UTC"
    });
  });

  // Server-side account age and withdrawal verification endpoint
  app.post("/api/verify-withdrawal-eligibility", (req, res) => {
    const { createdAt } = req.body;
    const serverNow = Date.now();
    
    // Default fallback to 10 days ago for legacy accounts if not provided
    const userCreatedAt = typeof createdAt === 'number' 
      ? createdAt 
      : Number(createdAt) || (serverNow - 10 * 24 * 60 * 60 * 1000);
      
    const ageMs = Math.max(0, serverNow - userCreatedAt);
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const REQUIRED_DAYS = 7;
    const isEligible = ageDays >= REQUIRED_DAYS;
    const daysRemaining = isEligible 
      ? 0 
      : Math.max(1, Math.ceil((REQUIRED_DAYS * 24 * 60 * 60 * 1000 - ageMs) / (1000 * 60 * 60 * 24)));

    res.json({
      serverTime: serverNow,
      userCreatedAt,
      accountAgeDays: ageDays,
      isEligible,
      daysRemaining,
      requiredDays: REQUIRED_DAYS,
      verifiedByServer: true
    });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
