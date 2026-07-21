import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { computePanchamiDays } from "./src/server/panchamiCalc";
import { findNearbyVegHotels } from "./src/server/hotels";

const app = express();
const PORT = 3000;

app.use(express.json());

const ADVICE_CACHE_PATH = path.join(process.cwd(), "data", "advice_cache.json");

// Fallback advice used if the daily-generated cache is missing (e.g. first run before
// the GitHub Action has ever executed).
const FALLBACK_ADVICE = {
  recipe: `### 🥦 Standard Pure Veg Fasting Recipes

1. **Vendhaya Kali (Fenugreek Sweet Porridge)** - Soak rice and fenugreek, grind smooth, cook with palm jaggery and sesame oil.
2. **Pooshnikai Kootu (Pumpkin Lentil Stew)** - Boil moong dal and pumpkin, add ground coconut-cumin paste, temper with mustard seeds.
3. **Neer Mor & Sundal** - Spiced buttermilk paired with tempered boiled chickpeas and coconut.`,
  tips: `### 🌟 Stay On Track: Fasting Guidelines

* **Pure Hydration:** Drink plenty of water, tender coconut, or buttermilk throughout the day.
* **Satvik Diet:** Keep meals light - fresh fruits, steamed vegetables, and lentils.
* **Mindful Eating:** Eat slowly and mindfully during break-fast.
* **Stay Consistent:** Completing the fast fully is what matters most - one day at a time.`,
};

function getAdviceCache(): { recipe: string; tips: string; generatedAt?: string } {
  if (fs.existsSync(ADVICE_CACHE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(ADVICE_CACHE_PATH, "utf-8"));
    } catch (e) {
      console.error("Failed to parse advice cache, using fallback", e);
    }
  }
  return FALLBACK_ADVICE;
}

// 1. Get Panchami Dates - computed live via astronomy, no AI, no network call
app.get("/api/panchami", (req, res) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 2, 0, 1));
  const panchamiDays = computePanchamiDays(start, end);
  res.json({ success: true, panchamiDays });
});

// 2. Manual recompute - same computation, kept as a POST for a "refresh" button in the UI.
// Optionally accepts { years: number } to compute further ahead.
app.post("/api/panchami/sync", (req, res) => {
  try {
    const yearsAhead = Number(req.body?.years) || 2;
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear() + yearsAhead, 0, 1));
    const panchamiDays = computePanchamiDays(start, end);
    res.json({ success: true, panchamiDays, source: "computed" });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to compute calendar." });
  }
});

// 3. Find nearby pure vegetarian hotels using OpenStreetMap (free, no API key)
app.post("/api/panchami/hotels", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: "Latitude and Longitude are required." });
    }
    const hotels = await findNearbyVegHotels(Number(lat), Number(lng));
    res.json({ success: true, hotels });
  } catch (err: any) {
    console.error("Hotel fetch error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to fetch nearby hotels." });
  }
});

// 4. Generate dynamic fasting recipe or tips - served from the daily-generated cache
app.post("/api/panchami/advice", (req, res) => {
  try {
    const { requestType } = req.body;
    const cache = getAdviceCache();
    const text = requestType === "recipe" ? cache.recipe : cache.tips;
    res.json({ success: true, text, generatedAt: cache.generatedAt || null });
  } catch (error: any) {
    console.error("Advice error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to load fasting advice." });
  }
});

// Vite configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
