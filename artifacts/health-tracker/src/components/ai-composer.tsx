import { useRef, useState } from "react";
import { format } from "date-fns";
import { Mic, Camera, Send, Square, Loader2, Sparkles, X, Check } from "lucide-react";
import {
  useParseLogText,
  useParseLogVoice,
  useAnalyzeMealPhoto,
  useCreateMeal,
  useUpdateDailyLog,
  getGetDashboardTodayQueryKey,
  getGetMealsQueryKey,
  getGetDailyLogQueryKey,
  LogProposal,
  MealPhotoAnalysis,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

async function fileToCompressedBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const MAX = 1024;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: jpeg.split(",")[1], mediaType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const DAILY_LABELS: Record<string, string> = {
  water: "Water (ml)",
  steps: "Steps",
  weight: "Weight (kg)",
  sleepHours: "Sleep (hrs)",
  workoutMinutes: "Workout (min)",
  workoutType: "Workout type",
  reflux: "Reflux (1-5)",
  energy: "Energy (1-5)",
  stress: "Stress (1-5)",
  headache: "Headache (1-5)",
  postMealSleepiness: "Post-meal sleepiness",
  bowelMovement: "Bowel movement",
  notes: "Notes",
};

export function AiComposer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<LogProposal | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseText = useParseLogText();
  const parseVoice = useParseLogVoice();
  const analyzePhoto = useAnalyzeMealPhoto();
  const createMeal = useCreateMeal();
  const updateDailyLog = useUpdateDailyLog();

  const today = format(new Date(), "yyyy-MM-dd");

  function handleAiError(err: any) {
    const msg =
      err?.response?.status === 429
        ? err?.response?.data?.error ?? "Free AI limit reached — upgrade to Pro for unlimited logging."
        : "Samajh nahi aaya — please try again.";
    toast({ variant: "destructive", description: msg });
  }

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    parseText.mutate(
      { data: { text: trimmed } },
      {
        onSuccess: (result) => {
          setBusy(false);
          if (result.kind === "none") {
            toast({ description: result.message ?? "Kuch log karne layak nahi mila — try describing a meal, water, steps, or sleep." });
            return;
          }
          setText("");
          setProposal(result);
        },
        onError: (err) => {
          setBusy(false);
          handleAiError(err);
        },
      },
    );
  };

  const toggleRecording = async () => {
    if (busy) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 1000) return; // accidental tap
        setBusy(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          parseVoice.mutate(
            { data: { audioBase64, mimeType: blob.type } },
            {
              onSuccess: (result) => {
                setBusy(false);
                if (result.kind === "none") {
                  toast({ description: result.message ?? `Suna: "${result.transcript ?? ""}" — par kuch log karne layak nahi mila.` });
                  return;
                }
                setProposal(result);
              },
              onError: (err) => {
                setBusy(false);
                handleAiError(err);
              },
            },
          );
        } catch {
          setBusy(false);
          toast({ variant: "destructive", description: "Could not read the recording." });
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast({ variant: "destructive", description: "Microphone permission chahiye — please allow mic access." });
    }
  };

  const onPhotoSelected = async (file: File | null) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const { base64, mediaType } = await fileToCompressedBase64(file);
      analyzePhoto.mutate(
        { data: { imageBase64: base64, mediaType } },
        {
          onSuccess: (result) => {
            setBusy(false);
            if (!result.foodItems.length) {
              toast({ description: result.notes ?? "Photo mein khana nahi mila — try another photo." });
              return;
            }
            setProposal({ kind: "meal", meal: result, dailyLogPatch: null, transcript: null, message: null, date: null });
          },
          onError: (err) => {
            setBusy(false);
            handleAiError(err);
          },
        },
      );
    } catch {
      setBusy(false);
      toast({ variant: "destructive", description: "Could not read that image." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveProposal = async () => {
    if (!proposal || saving) return;
    setSaving(true);
    const date = proposal.date ?? today;
    const meal = proposal.meal as MealPhotoAnalysis | null | undefined;
    const patch = proposal.dailyLogPatch as Record<string, unknown> | null | undefined;
    try {
      if (meal && meal.foodItems.length > 0) {
        await createMeal.mutateAsync({
          data: {
            date,
            mealType: meal.mealType ?? "snack",
            notes: meal.dishName,
            totalCalories: meal.totalCalories,
            totalProtein: meal.totalProtein,
            totalCarbs: meal.totalCarbs,
            totalFat: meal.totalFat,
            totalFiber: meal.totalFiber,
            foodItems: meal.foodItems.map((fi) => ({ ...fi, mealId: 0 })),
          },
        });
      }
      if (patch && Object.keys(patch).length > 0) {
        await updateDailyLog.mutateAsync({ date, data: patch });
      }
      queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMealsQueryKey({ date }) });
      queryClient.invalidateQueries({ queryKey: getGetDailyLogQueryKey(date) });
      toast({ description: "Log ho gaya ✓" });
      setProposal(null);
    } catch {
      toast({ variant: "destructive", description: "Save nahi hua — please try again." });
    } finally {
      setSaving(false);
    }
  };

  const meal = proposal?.meal as MealPhotoAnalysis | null | undefined;
  const patch = (proposal?.dailyLogPatch ?? null) as Record<string, unknown> | null;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-[80px] z-40 px-4 pb-3">
        <div className="pointer-events-auto rounded-3xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant={recording ? "destructive" : "ghost"}
              className={cn("h-11 w-11 shrink-0 rounded-2xl", recording && "animate-pulse")}
              onClick={toggleRecording}
              disabled={busy}
              data-testid="button-composer-voice"
              aria-label={recording ? "Stop recording" : "Record a voice note"}
            >
              {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 shrink-0 rounded-2xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || recording}
              data-testid="button-composer-photo"
              aria-label="Log a meal photo"
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder={recording ? "Sun rahe hain…" : busy ? "Soch rahe hain…" : "Kya khaya? Kitna paani? Bol do…"}
              className="h-11 flex-1 rounded-2xl border-0 bg-muted/70 focus-visible:ring-primary"
              disabled={busy || recording}
              data-testid="input-composer-text"
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 rounded-2xl"
              onClick={submitText}
              disabled={busy || recording || !text.trim()}
              data-testid="button-composer-send"
              aria-label="Log it"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
        />
      </div>

      <Drawer open={!!proposal} onOpenChange={(open) => !open && !saving && setProposal(null)}>
        <DrawerContent className="mx-auto max-w-[430px]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 font-serif">
              <Sparkles className="h-5 w-5 text-secondary" />
              Yeh log karein?
            </DrawerTitle>
            {proposal?.transcript && (
              <p className="text-left text-sm italic text-muted-foreground">"{proposal.transcript}"</p>
            )}
          </DrawerHeader>

          <div className="max-h-[50vh] space-y-4 overflow-y-auto px-4">
            {meal && meal.foodItems.length > 0 && (
              <div className="rounded-2xl border border-border p-4">
                <p className="font-medium" data-testid="text-proposal-dish">{meal.dishName}</p>
                <p className="text-sm capitalize text-muted-foreground">{meal.mealType ?? "snack"}</p>
                <div className="mt-2 space-y-1">
                  {meal.foodItems.map((fi, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {fi.name}
                        {fi.portion ? ` · ${fi.portion}${fi.unit ?? ""}` : ""}
                      </span>
                      <span className="text-muted-foreground">{fi.calories != null ? `${Math.round(fi.calories)} kcal` : ""}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
                  {meal.totalCalories != null && <span>{Math.round(meal.totalCalories)} kcal</span>}
                  {meal.totalProtein != null && <span>P {Math.round(meal.totalProtein)}g</span>}
                  {meal.totalCarbs != null && <span>C {Math.round(meal.totalCarbs)}g</span>}
                  {meal.totalFat != null && <span>F {Math.round(meal.totalFat)}g</span>}
                  {meal.totalFiber != null && <span>Fb {Math.round(meal.totalFiber)}g</span>}
                </div>
              </div>
            )}

            {patch && Object.keys(patch).length > 0 && (
              <div className="rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Daily log</p>
                <div className="space-y-1">
                  {Object.entries(patch).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span>{DAILY_LABELS[k] ?? k}</span>
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proposal?.date && proposal.date !== today && (
              <p className="text-center text-xs text-muted-foreground">For {proposal.date}</p>
            )}
          </div>

          <DrawerFooter className="flex-row gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => setProposal(null)}
              disabled={saving}
              data-testid="button-proposal-cancel"
            >
              <X className="mr-1 h-4 w-4" /> Nahi
            </Button>
            <Button
              className="flex-1 rounded-2xl"
              onClick={saveProposal}
              disabled={saving}
              data-testid="button-proposal-save"
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Haan, log karo
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
