import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AnalyzeMealPhotoBody, AnalyzeMealPhotoResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a nutrition analysis expert specializing in Indian and international cuisine.
Analyze the meal photo and identify the dish and its component food items with estimated portions and nutrition.
Respond ONLY with valid JSON matching this exact shape (no markdown, no extra text):
{
  "dishName": string,
  "mealType": "breakfast" | "lunch" | "snack" | "dinner" | null,
  "notes": string | null,
  "totalCalories": number | null,
  "totalProtein": number | null,
  "totalCarbs": number | null,
  "totalFat": number | null,
  "totalFiber": number | null,
  "foodItems": [
    { "name": string, "portion": number | null, "unit": string | null,
      "calories": number | null, "protein": number | null, "carbs": number | null,
      "fat": number | null, "fiber": number | null }
  ]
}
Rules:
- Nutrition values are numbers (grams for macros, kcal for calories), estimated for the visible portion size.
- "portion" is the quantity, "unit" is a short label like "piece", "bowl", "cup", "g", "ml".
- Totals should equal the sum of the food items.
- If the image does not contain food, return {"dishName": "", "foodItems": [], "notes": "No food detected in the image."} with all other fields null.`;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decoded
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Magic-byte sniffing so we never forward non-image payloads to the AI service.
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

// Simple in-memory rate limit: analysis is an expensive AI call.
const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute
let windowStart = Date.now();
let windowCount = 0;

function rateLimited(): boolean {
  const now = Date.now();
  if (now - windowStart > RATE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount++;
  return windowCount > RATE_LIMIT;
}

// Clamp nutrition numbers to sane non-negative values; drop garbage.
function cleanNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
}

router.post("/meals/analyze-photo", async (req, res): Promise<void> => {
  if (rateLimited()) {
    res.status(429).json({ error: "Too many photo analyses. Please wait a minute and try again." });
    return;
  }

  const parsed = AnalyzeMealPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64 } = parsed.data;

  if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64)) {
    res.status(400).json({ error: "Invalid image data." });
    return;
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(imageBase64, "base64");
  } catch {
    res.status(400).json({ error: "Invalid image data." });
    return;
  }

  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    res.status(400).json({ error: "Image must be between 1 byte and 8MB." });
    return;
  }

  const sniffed = sniffImageType(buf);
  if (!sniffed || !ALLOWED_MEDIA_TYPES.has(sniffed)) {
    res.status(400).json({ error: "Only JPEG, PNG, or WebP images are supported." });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this meal photo." },
            {
              type: "image_url",
              image_url: { url: `data:${sniffed};base64,${buf.toString("base64")}` },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let candidate: any;
    try {
      candidate = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: "AI returned an unreadable response. Please try again." });
      return;
    }

    // Sanitize numeric fields before strict validation.
    if (candidate && typeof candidate === "object") {
      for (const k of ["totalCalories", "totalProtein", "totalCarbs", "totalFat", "totalFiber"]) {
        candidate[k] = cleanNumber(candidate[k]);
      }
      if (Array.isArray(candidate.foodItems)) {
        candidate.foodItems = candidate.foodItems
          .filter((fi: any) => fi && typeof fi.name === "string" && fi.name.trim().length > 0)
          .map((fi: any) => ({
            name: String(fi.name).slice(0, 200),
            portion: cleanNumber(fi.portion),
            unit: typeof fi.unit === "string" ? fi.unit.slice(0, 50) : null,
            calories: cleanNumber(fi.calories),
            protein: cleanNumber(fi.protein),
            carbs: cleanNumber(fi.carbs),
            fat: cleanNumber(fi.fat),
            fiber: cleanNumber(fi.fiber),
          }));
      }
    }

    const validated = AnalyzeMealPhotoResponse.safeParse(candidate);
    if (!validated.success) {
      res.status(502).json({ error: "AI response was incomplete. Please try again." });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    console.error("Meal photo analysis failed:", err);
    res.status(502).json({ error: "Photo analysis failed. Please try again." });
  }
});

export default router;
