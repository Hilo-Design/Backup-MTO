import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db, dailyLogsTable, mealsTable, foodItemsTable } from "@workspace/db";
import { ImportExcelBody } from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_FILE_BYTES = 10 * 1024 * 1024; // base64 of 10MB stays under the 20MB JSON body cap
const MAX_SHEETS = 10;
const MAX_ROWS_PER_SHEET = 5000;

// Header → daily_logs column mapping (case/space/underscore-insensitive).
const DAILY_FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "day", "logdate"],
  calories: ["calories", "kcal", "totalcalories", "energykcal"],
  protein: ["protein", "proteing", "proteings"],
  carbs: ["carbs", "carbohydrates", "carbsg"],
  fat: ["fat", "fats", "fatg"],
  fiber: ["fiber", "fibre", "fiberg"],
  water: ["water", "waterml", "waterintake", "hydration"],
  weight: ["weight", "weightkg", "bodyweight"],
  steps: ["steps", "stepcount", "dailysteps"],
  workoutMinutes: ["workoutminutes", "workoutmins", "exerciseminutes", "workout"],
  workoutType: ["workouttype", "exercisetype", "activity"],
  sleepHours: ["sleephours", "sleep", "sleephrs"],
  reflux: ["reflux", "acidity", "acidreflux"],
  postMealSleepiness: ["postmealsleepiness", "sleepiness", "postmealsleepy"],
  energy: ["energy", "energylevel"],
  headache: ["headache", "headaches"],
  stress: ["stress", "stresslevel"],
  bowelMovement: ["bowelmovement", "bowel", "stool", "motion"],
  hungerBeforeLunch: ["hungerbeforelunch", "lunchhunger"],
  hungerBeforeDinner: ["hungerbeforedinner", "dinnerhunger"],
  hungerBeforeBed: ["hungerbeforebed", "bedhunger", "nighthunger"],
  muscleStiffness: ["musclestiffness", "stiffness"],
  notes: ["notes", "note", "comments", "remarks"],
};

const NUMERIC_FIELDS = new Set([
  "calories", "protein", "carbs", "fat", "fiber", "water", "weight", "steps",
  "workoutMinutes", "sleepHours", "reflux", "postMealSleepiness", "energy",
  "headache", "stress", "hungerBeforeLunch", "hungerBeforeDinner",
  "hungerBeforeBed", "muscleStiffness",
]);

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]): Map<number, string> {
  const map = new Map<number, string>();
  headers.forEach((h, idx) => {
    const n = normHeader(String(h ?? ""));
    if (!n) return;
    for (const [field, aliases] of Object.entries(DAILY_FIELD_ALIASES)) {
      if (aliases.includes(n)) { map.set(idx, field); break; }
    }
  });
  return map;
}

function toDateStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "number") {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return `${parsed.y.toString().padStart(4, "0")}-${parsed.m.toString().padStart(2, "0")}-${parsed.d.toString().padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dm = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dm) {
    // Assume DD/MM/YYYY (Indian convention)
    const [, d, m, y] = dm;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

router.post("/import/excel", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = ImportExcelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const buf = Buffer.from(parsed.data.fileBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (buf.length === 0 || buf.length > MAX_FILE_BYTES) {
    res.status(400).json({ error: "File must be between 1 byte and 15MB." });
    return;
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    res.status(400).json({ error: "Could not read the file. Please upload an .xlsx, .xls, or .csv file." });
    return;
  }

  let dailyLogsImported = 0;
  let mealsImported = 0;
  let skippedRows = 0;
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames.slice(0, MAX_SHEETS)) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (rows.length < 2) continue;
    if (rows.length - 1 > MAX_ROWS_PER_SHEET) {
      warnings.push(`Sheet "${sheetName}": only the first ${MAX_ROWS_PER_SHEET} rows were imported.`);
      rows.length = MAX_ROWS_PER_SHEET + 1;
    }

    const headerMap = buildHeaderMap(rows[0] as string[]);
    const dateIdx = [...headerMap.entries()].find(([, f]) => f === "date")?.[0];
    if (dateIdx == null) {
      warnings.push(`Sheet "${sheetName}": no date column found — skipped.`);
      continue;
    }

    const isMealSheet = normHeader(sheetName).includes("meal");

    for (const row of rows.slice(1)) {
      const date = toDateStr(row[dateIdx]);
      if (!date) { skippedRows++; continue; }

      if (isMealSheet) {
        // Meal sheets: look for a dish/meal name column heuristically
        const nameIdx = (rows[0] as string[]).findIndex((h) => /dish|meal.?name|food|item/i.test(String(h ?? "")));
        const mealTypeIdx = (rows[0] as string[]).findIndex((h) => /meal.?type|type/i.test(String(h ?? "")));
        const name = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
        if (!name) { skippedRows++; continue; }

        const record: Record<string, unknown> = { userId, date, notes: name };
        const rawType = mealTypeIdx >= 0 ? String(row[mealTypeIdx] ?? "").toLowerCase().trim() : "";
        record.mealType = ["breakfast", "lunch", "snack", "dinner"].includes(rawType) ? rawType : "snack";
        for (const [idx, field] of headerMap) {
          if (field === "date" || field === "notes") continue;
          const col = `total${field.charAt(0).toUpperCase()}${field.slice(1)}`;
          if (["totalCalories", "totalProtein", "totalCarbs", "totalFat", "totalFiber"].includes(col)) {
            record[col] = toNum(row[idx]);
          }
        }
        const [meal] = await db.insert(mealsTable).values(record as any).returning();
        await db.insert(foodItemsTable).values({ mealId: meal.id, name });
        mealsImported++;
        continue;
      }

      // Daily log row — upsert on (userId, date)
      const patch: Record<string, unknown> = {};
      for (const [idx, field] of headerMap) {
        if (field === "date") continue;
        const v = NUMERIC_FIELDS.has(field) ? toNum(row[idx]) : (row[idx] == null ? null : String(row[idx]).trim() || null);
        if (v != null) patch[field] = v;
      }
      if (Object.keys(patch).length === 0) { skippedRows++; continue; }

      const [existing] = await db.select({ id: dailyLogsTable.id }).from(dailyLogsTable)
        .where(and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, date))).limit(1);
      if (existing) {
        await db.update(dailyLogsTable).set(patch).where(eq(dailyLogsTable.id, existing.id));
      } else {
        await db.insert(dailyLogsTable).values({ userId, date, ...patch } as any);
      }
      dailyLogsImported++;
    }
  }

  res.json({ dailyLogsImported, mealsImported, skippedRows, warnings });
});

export default router;
