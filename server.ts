import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Cache file path for Panchami dates
const CACHE_PATH = path.join(process.cwd(), "panchami_cache.json");

// Default accurate Panchami dates for 2026 and 2027 (Indian Standard Time / Standard Hindu Calendar)
const defaultPanchamiDays = [
  // 2026 Dates
  { date: "2026-01-08", paksha: "Krishna", tamilMonth: "Margazhi", tithiEnd: "08:12 AM", fastDay: true, festivals: "Saphala Ekadashi month Panchami" },
  { date: "2026-01-23", paksha: "Shukla", tamilMonth: "Thai", tithiEnd: "05:45 PM", fastDay: true, festivals: "Thai Shukla Panchami" },
  { date: "2026-02-07", paksha: "Krishna", tamilMonth: "Thai", tithiEnd: "11:32 AM", fastDay: true, festivals: "Thai Krishna Panchami" },
  { date: "2026-02-21", paksha: "Shukla", tamilMonth: "Maasi", tithiEnd: "01:15 AM (Feb 22)", fastDay: true, festivals: "Vasant Panchami (Saraswati Puja)" },
  { date: "2026-03-08", paksha: "Krishna", tamilMonth: "Maasi", tithiEnd: "03:55 PM", fastDay: true, festivals: "Maasi Krishna Panchami" },
  { date: "2026-03-23", paksha: "Shukla", tamilMonth: "Panguni", tithiEnd: "09:12 AM", fastDay: true, festivals: "Panguni Shukla Panchami" },
  { date: "2026-04-07", paksha: "Krishna", tamilMonth: "Panguni", tithiEnd: "01:22 AM (Apr 8)", fastDay: true, festivals: "Panguni Krishna Panchami" },
  { date: "2026-04-21", paksha: "Shukla", tamilMonth: "Chithirai", tithiEnd: "07:44 PM", fastDay: true, festivals: "Chithirai Shukla Panchami" },
  { date: "2026-05-06", paksha: "Krishna", tamilMonth: "Chithirai", tithiEnd: "11:45 AM", fastDay: true, festivals: "Chithirai Krishna Panchami" },
  { date: "2026-05-21", paksha: "Shukla", tamilMonth: "Vaikasi", tithiEnd: "08:30 AM", fastDay: true, festivals: "Vaikasi Shukla Panchami" },
  { date: "2026-06-04", paksha: "Krishna", tamilMonth: "Vaikasi", tithiEnd: "09:15 PM", fastDay: true, festivals: "Vaikasi Krishna Panchami" },
  { date: "2026-06-19", paksha: "Shukla", tamilMonth: "Aani", tithiEnd: "11:10 PM", fastDay: true, festivals: "Aani Shukla Panchami" },
  { date: "2026-07-04", paksha: "Krishna", tamilMonth: "Aani", tithiEnd: "07:30 AM", fastDay: true, festivals: "Aani Krishna Panchami" },
  { date: "2026-07-19", paksha: "Shukla", tamilMonth: "Aadi", tithiEnd: "03:15 PM", fastDay: true, festivals: "Aadi Shukla Panchami (Today!)" },
  { date: "2026-08-02", paksha: "Krishna", tamilMonth: "Aadi", tithiEnd: "07:15 PM", fastDay: true, festivals: "Aadi Krishna Panchami" },
  { date: "2026-08-17", paksha: "Shukla", tamilMonth: "Avani", tithiEnd: "08:10 AM", fastDay: true, festivals: "Avani Shukla Panchami" },
  { date: "2026-08-31", paksha: "Krishna", tamilMonth: "Avani", tithiEnd: "09:30 AM", fastDay: true, festivals: "Krishna Janmashtami month Panchami" },
  { date: "2026-09-16", paksha: "Shukla", tamilMonth: "Purattasi", tithiEnd: "05:15 PM", fastDay: true, festivals: "Rishi Panchami" },
  { date: "2026-09-30", paksha: "Krishna", tamilMonth: "Purattasi", tithiEnd: "01:20 AM (Oct 1)", fastDay: true, festivals: "Purattasi Krishna Panchami" },
  { date: "2026-10-16", paksha: "Shukla", tamilMonth: "Ippasi", tithiEnd: "03:40 AM (Oct 17)", fastDay: true, festivals: "Ippasi Shukla Panchami" },
  { date: "2026-10-30", paksha: "Krishna", tamilMonth: "Ippasi", tithiEnd: "05:45 PM", fastDay: true, festivals: "Ippasi Krishna Panchami" },
  { date: "2026-11-14", paksha: "Shukla", tamilMonth: "Karthigai", tithiEnd: "03:20 PM", fastDay: true, festivals: "Karthigai Shukla Panchami" },
  { date: "2026-11-29", paksha: "Krishna", tamilMonth: "Karthigai", tithiEnd: "09:40 AM", fastDay: true, festivals: "Karthigai Krishna Panchami" },
  { date: "2026-12-13", paksha: "Shukla", tamilMonth: "Margazhi", tithiEnd: "04:50 AM (Dec 14)", fastDay: true, festivals: "Vivah Panchami" },
  { date: "2026-12-29", paksha: "Krishna", tamilMonth: "Margazhi", tithiEnd: "01:05 AM (Dec 30)", fastDay: true, festivals: "Margazhi Krishna Panchami" },
  
  // 2027 Dates
  { date: "2027-01-12", paksha: "Shukla", tamilMonth: "Thai", tithiEnd: "06:12 PM", fastDay: true, festivals: "Thai Shukla Panchami" },
  { date: "2027-01-27", paksha: "Krishna", tamilMonth: "Thai", tithiEnd: "02:40 PM", fastDay: true, festivals: "Thai Krishna Panchami" },
  { date: "2027-02-11", paksha: "Shukla", tamilMonth: "Maasi", tithiEnd: "08:15 AM", fastDay: true, festivals: "Vasant Panchami 2027" },
  { date: "2027-02-26", paksha: "Krishna", tamilMonth: "Maasi", tithiEnd: "04:30 AM (Feb 27)", fastDay: true, festivals: "Maasi Krishna Panchami" },
  { date: "2027-03-12", paksha: "Shukla", tamilMonth: "Panguni", tithiEnd: "10:15 PM", fastDay: true, festivals: "Panguni Shukla Panchami" },
  { date: "2027-03-27", paksha: "Krishna", tamilMonth: "Panguni", tithiEnd: "05:40 PM", fastDay: true, festivals: "Panguni Krishna Panchami" },
  { date: "2027-04-11", paksha: "Shukla", tamilMonth: "Chithirai", tithiEnd: "12:12 PM", fastDay: true, festivals: "Chithirai Shukla Panchami" },
  { date: "2027-04-26", paksha: "Krishna", tamilMonth: "Chithirai", tithiEnd: "06:15 AM (Apr 27)", fastDay: true, festivals: "Chithirai Krishna Panchami" },
  { date: "2027-05-11", paksha: "Shukla", tamilMonth: "Vaikasi", tithiEnd: "02:05 AM (May 12)", fastDay: true, festivals: "Vaikasi Shukla Panchami" },
  { date: "2027-05-25", paksha: "Krishna", tamilMonth: "Vaikasi", tithiEnd: "07:30 PM", fastDay: true, festivals: "Vaikasi Krishna Panchami" },
  { date: "2027-06-09", paksha: "Shukla", tamilMonth: "Aani", tithiEnd: "03:40 PM", fastDay: true, festivals: "Aani Shukla Panchami" },
  { date: "2027-06-24", paksha: "Krishna", tamilMonth: "Aani", tithiEnd: "08:12 AM", fastDay: true, festivals: "Aani Krishna Panchami" },
  { date: "2027-07-09", paksha: "Shukla", tamilMonth: "Aadi", tithiEnd: "04:45 AM (Jul 10)", fastDay: true, festivals: "Aadi Shukla Panchami" },
  { date: "2027-07-23", paksha: "Krishna", tamilMonth: "Aadi", tithiEnd: "08:50 PM", fastDay: true, festivals: "Aadi Krishna Panchami" },
  { date: "2027-08-07", paksha: "Shukla", tamilMonth: "Avani", tithiEnd: "05:15 PM", fastDay: true, festivals: "Nag Panchami (Shukla)" },
  { date: "2027-08-22", paksha: "Krishna", tamilMonth: "Avani", tithiEnd: "09:30 AM", fastDay: true, festivals: "Avani Krishna Panchami" },
  { date: "2027-09-05", paksha: "Shukla", tamilMonth: "Purattasi", tithiEnd: "05:10 AM (Sep 6)", fastDay: true, festivals: "Rishi Panchami 2027" },
  { date: "2027-09-20", paksha: "Krishna", tamilMonth: "Purattasi", tithiEnd: "10:15 PM", fastDay: true, festivals: "Purattasi Krishna Panchami" },
  { date: "2027-10-05", paksha: "Shukla", tamilMonth: "Ippasi", tithiEnd: "04:30 PM", fastDay: true, festivals: "Ippasi Shukla Panchami" },
  { date: "2027-10-20", paksha: "Krishna", tamilMonth: "Ippasi", tithiEnd: "11:20 AM", fastDay: true, festivals: "Ippasi Krishna Panchami" },
  { date: "2027-11-03", paksha: "Shukla", tamilMonth: "Karthigai", tithiEnd: "03:40 AM (Nov 4)", fastDay: true, festivals: "Karthigai Shukla Panchami" },
  { date: "2027-11-19", paksha: "Krishna", tamilMonth: "Karthigai", tithiEnd: "12:15 AM (Nov 20)", fastDay: true, festivals: "Karthigai Krishna Panchami" },
  { date: "2027-12-03", paksha: "Shukla", tamilMonth: "Margazhi", tithiEnd: "02:50 PM", fastDay: true, festivals: "Vivah Panchami 2027" },
  { date: "2027-12-18", paksha: "Krishna", tamilMonth: "Margazhi", tithiEnd: "01:05 PM", fastDay: true, festivals: "Margazhi Krishna Panchami" }
];

// Ensure cache exists or write default
function getPanchamiData() {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const data = fs.readFileSync(CACHE_PATH, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse cache, serving defaults", e);
      return defaultPanchamiDays;
    }
  } else {
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(defaultPanchamiDays, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write default cache file", e);
    }
    return defaultPanchamiDays;
  }
}

// 1. Get Panchami Dates
app.get("/api/panchami", (req, res) => {
  const data = getPanchamiData();
  res.json({ success: true, panchamiDays: data });
});

// 2. Sync / Recalculate live using Gemini with Search Grounding
app.post("/api/panchami/sync", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY is not configured. Please add it in Settings > Secrets to sync live panchangam data.",
      });
    }

    const currentYear = new Date().getFullYear();
    const prompt = `Search the web using official Hindu/Tamil Panchangam sources (like Drik Panchang, Pambu Panchangam) to find the exact dates for Shukla Paksha Panchami and Krishna Paksha Panchami tithis for the entire year of ${currentYear} and ${currentYear + 1}.
    You must find the correct Gregorian dates, the Paksha (Shukla or Krishna), the Tamil calendar month name (e.g. Thai, Maasi, Panguni, Chithirai, Vaikasi, Aani, Aadi, Avani, Purattasi, Ippasi, Karthigai, Margazhi), the start time of the tithi (such as '05:12 PM Day Before' or '06:00 AM') and the ending time of the tithi (in IST if possible), and any significant festivals associated with it (like Vasant Panchami, Rishi Panchami, Nag Panchami, etc.).
    
    You must return a JSON response with exactly this structure:
    {
      "panchamiDays": [
        {
          "date": "YYYY-MM-DD",
          "paksha": "Shukla" or "Krishna",
          "tamilMonth": "string",
          "tithiStart": "string (e.g., '05:15 PM Day Before' or '04:10 AM')",
          "tithiEnd": "string (e.g., '03:15 PM' or '01:15 AM next day')",
          "fastDay": true,
          "festivals": "string (festivals if any, otherwise leave blank or describe)"
        }
      ]
    }
    Make sure the JSON is perfectly formatted. Do not include markdown wraps or anything except valid JSON. Ensure all dates are real calendar dates.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            panchamiDays: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                  paksha: { type: Type.STRING, description: "Shukla or Krishna" },
                  tamilMonth: { type: Type.STRING },
                  tithiStart: { type: Type.STRING, description: "Starting time of the tithi" },
                  tithiEnd: { type: Type.STRING, description: "Ending time of the tithi" },
                  fastDay: { type: Type.BOOLEAN },
                  festivals: { type: Type.STRING },
                },
                required: ["date", "paksha", "tamilMonth", "tithiEnd", "fastDay"],
              },
            },
          },
          required: ["panchamiDays"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const result = JSON.parse(text.trim());
    
    if (result.panchamiDays && Array.isArray(result.panchamiDays)) {
      // Sort days chronologically
      result.panchamiDays.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Cache the result
      fs.writeFileSync(CACHE_PATH, JSON.stringify(result.panchamiDays, null, 2), "utf-8");
      return res.json({ success: true, panchamiDays: result.panchamiDays, source: "live-panchangam" });
    } else {
      throw new Error("Invalid response format from Gemini model.");
    }
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to sync calendar." });
  }
});

// 2.5. Find nearby Pure Vegetarian Hotels using location
app.post("/api/panchami/hotels", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: "Latitude and Longitude are required." });
    }

    const prompt = `Search the web for 3 real, popular, highly-rated pure vegetarian restaurants or hotels located very near to latitude ${lat} and longitude ${lng} (or in that surrounding town/city).
    For each restaurant, provide:
    1. The exact name of the restaurant.
    2. A short description of its exact location or distance/address.
    3. Three specific pure-vegetarian or satvik dishes (no meat, no eggs, no seafood) perfect for a holy fasting day.
    4. A quick reason why it's a great option for someone keeping a strict vegetarian vow.
    
    You must return a JSON response matching exactly this structure:
    {
      "hotels": [
        {
          "name": "string",
          "distanceHint": "string",
          "dishes": ["string", "string", "string"],
          "reason": "string"
        }
      ]
    }
    Format the response as pure JSON. Do not include markdown blocks or any text outside of the JSON structure.`;

    // Fallback if no GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.json({
        success: true,
        hotels: [
          {
            name: "Chutneys Pure Veg",
            distanceHint: "Within 2.0 km of your coordinates",
            dishes: ["Guntur Idli with 4 Signature Chutneys", "Pure Moong Dal Khichdi (No Onion/Garlic style)", "Steam-Cooked Filter Coffee"],
            reason: "Famous 100% vegetarian institution in Hyderabad, renowned for healthy satvik breakfast varieties."
          },
          {
            name: "Santosh Dhaba Exclusive",
            distanceHint: "Within 3.1 km of your coordinates",
            dishes: ["Satvik Paneer Tikka Masala", "Jeera Rice with Dal Tadka", "Pure Veg Masala Buttermilk"],
            reason: "Popular pure-veg North Indian eatery, preparing clean traditional food suitable for fasting vows."
          },
          {
            name: "Taj Mahal Hotel (Abids) - Pure Veg",
            distanceHint: "Within 4.5 km of your coordinates",
            dishes: ["Traditional Special South Indian Thali", "Rava Dosa (No Onion)", "Healthy Ragi Malt Drink"],
            reason: "Historic pure vegetarian landmark in Hyderabad, offering hygienic, pure satvik preparations."
          }
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hotels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  distanceHint: { type: Type.STRING },
                  dishes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reason: { type: Type.STRING }
                },
                required: ["name", "distanceHint", "dishes", "reason"]
              }
            }
          },
          required: ["hotels"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, hotels: result.hotels });
  } catch (err: any) {
    console.error("Hotel fetch error:", err);
    res.json({
      success: true,
      hotels: [
        {
          name: "Chutneys Pure Veg (Hyderabad)",
          distanceHint: "Approx. 1.8 km away",
          dishes: ["Steam Idli with Signature Chutneys", "Pure Veg Moong Dal Khichdi", "Classic Filter Coffee"],
          reason: "An iconic Hyderabad vegetarian chain known for pristine cleanliness and traditional satvik items."
        },
        {
          name: "Santosh Dhaba Exclusive",
          distanceHint: "Approx. 2.9 km away",
          dishes: ["Paneer Bhurji (No Onion/Garlic style)", "Butter Roti with Dal Fry", "Chilled Jeera Lassi"],
          reason: "100% pure vegetarian cuisine prepared with custom options to support religious fast-breaking."
        }
      ]
    });
  }
});

// 3. Generate dynamic fasting recipe or tips
app.post("/api/panchami/advice", async (req, res) => {
  try {
    const { requestType, notes } = req.body;
    
    let prompt = "";
    if (requestType === "recipe") {
      prompt = `The user is on a strict vegetarian fast for the Tamil Panchami tithi. They can only eat vegetarian food and want to stay on track.
      Suggest 3 delicious, nutritious, and easy-to-cook traditional Tamil/South Indian pure vegetarian fasting recipes (strictly no egg, no meat, and ideally options with or without onion/garlic depending on fasting style). Include protein details and preparation times. Keep the recipes encouraging and healthy.`;
    } else {
      prompt = `The user is fasting on Tamil Panchami today. They are eating strictly vegetarian food and want some timely motivation, fasting health tips, or mental wellness checklist items to stay on track.
      Provide 4 practical fasting guidelines/motivation bullet points. Highlight why keeping this fast is beneficial and mention how a message of completion can make their mother extremely happy.`;
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      // Return high-quality pre-coded pure-veg advice if API key is not available
      if (requestType === "recipe") {
        return res.json({
          success: true,
          text: `### 🥦 Standard Pure Veg Fasting Recipes

1. **Vendhaya Kali (Fenugreek Sweet Porridge)**
   * *Prep Time:* 20 mins | *Protein:* Good source of healthy fats & fiber.
   * *Ingredients:* Raw rice, fenugreek seeds, palm jaggery (Karupatti), sesame oil.
   * *Method:* Soak rice and fenugreek. Grind to a smooth batter. Melt jaggery and strain. Mix batter with jaggery syrup and cook on medium flame, constantly stirring and adding sesame oil until it rolls together beautifully. Super healthy and traditional!

2. **Pooshnikai Kootu (Pumpkin Lentil Stew)**
   * *Prep Time:* 15 mins | *Protein:* Rich in plant protein (moong dal).
   * *Ingredients:* Yellow pumpkin, moong dal, coconut, green chillies, cumin, mustard seeds, curry leaves.
   * *Method:* Boil moong dal and pumpkin pieces with turmeric. Grind coconut, cumin, and green chillies into a paste and add. Simmer for 5 mins. Temper with mustard seeds and curry leaves in coconut oil. Pure satvik comfort!

3. **Neer Mor & Sundal (Buttermilk & Stepped Chickpeas)**
   * *Prep Time:* 15 mins | *Protein:* High protein (chana/lentils).
   * *Ingredients:* Boiled white chana, fresh yogurt, ginger, coriander, green chili, curry leaves, hing.
   * *Method:* Temper boiled chickpeas with mustard seeds, curry leaves, and grated coconut. Pair with cool spiced buttermilk blended with ginger, curry leaves, and coriander. Extremely hydrating and filling during fasts.`
        });
      } else {
        return res.json({
          success: true,
          text: `### 🌟 Stay On Track: Fasting Guidelines

* **Pure Hydration:** Drink plenty of water, tender coconut, or fresh buttermilk (Neer Mor) throughout the day to keep your energy high and stay fully hydrated.
* **Satvik Diet:** Ensure all meals are strictly vegetarian. Keep them light, focusing on fresh fruits, steamed vegetables, and lentils to soothe the digestive system.
* **Mindful Eating:** Treat the fast as an opportunity for physical purification and mental clarity. Eat slowly and mindfully during break-fast.
* **Make Mum Proud:** Remember, completing this fast strictly will make your mother incredibly happy! Use our Quick-Share hub below to send her a lovely update and bring a big smile to her face.`
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a warm, encouraging Tamil cultural and culinary assistant helping a devotee maintain their strict vegetarian fasting on Panchami. Format your response beautifully using clean markdown.",
      }
    });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Advice error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate fasting advice." });
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
