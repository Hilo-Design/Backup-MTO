import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import {
  ParseLogTextBody,
  ParseLogVoiceBody,
  ParseLogTextResponse,
} from "@workspace/api-zod";
import { checkAiQuota, commitAiUsage } from "./plan";

const router: IRouter = Router();

const PARSE_SYSTEM_PROMPT = `You are Svasth, a health-logging assistant for Indian users. Given a user's natural-language note (English, Hindi, or Hinglish), extract structured health data.
Today's date is {TODAY}.
Respond ONLY with valid JSON (no markdown) of this exact shape:
{
  "kind": "meal" | "daily" | "both" | "none",
  "message": string | null,
  "date": string | null,
  "meal": null | {
    "dishName": string,
    "mealType": "breakfast" | "lunch" | "snack" | "dinner" | null,
    "notes": string | null,
    "totalCalories": number | null, "totalProtein": number | null,
    "totalCarbs": number | null, "totalFat": number | null, "totalFiber": number | null,
    "foodItems": [ { "name": string, "portion": number | null, "unit": string | null,
      "calories": number | null, "protein": number | null, "carbs": number | null,
      "fat": number | null, "fiber": number | null } ]
  },
  "dailyLogPatch": null | {
    "water": number | null, "steps": number | null, "weight": number | null,
    "sleepHours": number | null, "workoutMinutes": number | null, "workoutType": string | null,
    "reflux": number | null, "energy": number | null, "stress": number | null,
    "headache": number | null, "postMealSleepiness": number | null,
    "bowelMovement": string | null, "notes": string | null
  }
}
Rules:
- If the note describes food eaten, fill "meal" with realistic nutrition estimates for Indian portions.
- If it mentions water (ml), steps, weight (kg), sleep (hours), workouts, or symptoms (reflux/energy/stress/headache rated 1-5), fill "dailyLogPatch" with only the mentioned fields.
- "date" is YYYY-MM-DD only if the user mentions a day other than today, else null.
- "kind" is "none" only when nothing loggable is present; then set "message" explaining briefly (match user's language).
- Never invent data the user did not mention.`;

function cleanNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
}

const DAILY_NUM_FIELDS = [
  "water", "steps", "weight", "sleepHours", "workoutMinutes",
  "reflux", "energy", "stress", "headache", "postMealSleepiness",
] as const;

function sanitizeProposal(raw: any): any {
  const kind = ["meal", "daily", "both", "none"].includes(raw?.kind) ? raw.kind : "none";
  let meal = null;
  if (raw?.meal && typeof raw.meal === "object" && typeof raw.meal.dishName === "string") {
    const m = raw.meal;
    meal = {
      dishName: String(m.dishName).slice(0, 200),
      mealType: ["breakfast", "lunch", "snack", "dinner"].includes(m.mealType) ? m.mealType : null,
      notes: typeof m.notes === "string" ? m.notes.slice(0, 500) : null,
      totalCalories: cleanNumber(m.totalCalories),
      totalProtein: cleanNumber(m.totalProtein),
      totalCarbs: cleanNumber(m.totalCarbs),
      totalFat: cleanNumber(m.totalFat),
      totalFiber: cleanNumber(m.totalFiber),
      foodItems: Array.isArray(m.foodItems)
        ? m.foodItems.slice(0, 20).filter((fi: any) => fi && typeof fi.name === "string").map((fi: any) => ({
            mealId: 0,
            name: String(fi.name).slice(0, 200),
            portion: cleanNumber(fi.portion),
            unit: typeof fi.unit === "string" ? fi.unit.slice(0, 30) : null,
            calories: cleanNumber(fi.calories),
            protein: cleanNumber(fi.protein),
            carbs: cleanNumber(fi.carbs),
            fat: cleanNumber(fi.fat),
            fiber: cleanNumber(fi.fiber),
          }))
        : [],
    };
  }
  let dailyLogPatch: Record<string, unknown> | null = null;
  if (raw?.dailyLogPatch && typeof raw.dailyLogPatch === "object") {
    dailyLogPatch = {};
    for (const f of DAILY_NUM_FIELDS) {
      const v = cleanNumber(raw.dailyLogPatch[f]);
      if (v != null) dailyLogPatch[f] = v;
    }
    for (const f of ["workoutType", "bowelMovement", "notes"] as const) {
      if (typeof raw.dailyLogPatch[f] === "string") dailyLogPatch[f] = raw.dailyLogPatch[f].slice(0, 300);
    }
    if (Object.keys(dailyLogPatch).length === 0) dailyLogPatch = null;
  }
  const date = typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  return {
    kind: meal == null && dailyLogPatch == null ? "none" : kind,
    message: typeof raw?.message === "string" ? raw.message.slice(0, 500) : null,
    meal,
    dailyLogPatch,
    date,
    transcript: null,
  };
}

async function parseText(text: string) {
  const today = new Date().toISOString().slice(0, 10);
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT.replace("{TODAY}", today) },
      { role: "user", content: text.slice(0, 2000) },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "{}";
  return sanitizeProposal(JSON.parse(content));
}

router.post("/log/parse", async (req, res): Promise<void> => {
  const parsed = ParseLogTextBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const quota = await checkAiQuota(req.userId!);
  if (!quota.ok) { res.status(429).json({ error: quota.error }); return; }

  try {
    const proposal = await parseText(parsed.data.text);
    const validated = ParseLogTextResponse.safeParse(proposal);
    if (!validated.success) { res.status(502).json({ error: "AI returned an invalid result. Please try again." }); return; }
    await commitAiUsage(req.userId!);
    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "log parse failed");
    res.status(502).json({ error: "Could not understand that right now. Please try again." });
  }
});

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

router.post("/log/voice", async (req, res): Promise<void> => {
  const parsed = ParseLogVoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const quota = await checkAiQuota(req.userId!);
  if (!quota.ok) { res.status(429).json({ error: quota.error }); return; }

  const audioBuffer = Buffer.from(parsed.data.audioBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (audioBuffer.length === 0 || audioBuffer.length > MAX_AUDIO_BYTES) {
    res.status(400).json({ error: "Audio must be between 1 byte and 15MB." });
    return;
  }

  try {
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const file = new File([new Uint8Array(buffer)], `note.${format}`, { type: `audio/${format}` });
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
      response_format: "json",
    });
    const transcript = transcription.text?.trim();
    if (!transcript) { res.status(502).json({ error: "Could not hear anything in the recording." }); return; }

    const proposal = await parseText(transcript);
    proposal.transcript = transcript;
    const validated = ParseLogTextResponse.safeParse(proposal);
    if (!validated.success) { res.status(502).json({ error: "AI returned an invalid result. Please try again." }); return; }
    await commitAiUsage(req.userId!);
    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "voice log failed");
    res.status(502).json({ error: "Could not process the voice note. Please try again." });
  }
});

export default router;
