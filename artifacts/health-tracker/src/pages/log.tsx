import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Check, Plus } from "lucide-react";
import { 
  useGetDailyLog, 
  getGetDailyLogQueryKey, 
  useCreateDailyLog,
  useUpdateDailyLog
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SymptomRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => {
          const val = i * 2; // Map to 0-10 scale (or 2,4,6,8,10)
          return (
            <button
              key={i}
              className={cn(
                "w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors",
                value >= val - 1 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-primary/20"
              )}
              onClick={() => onChange(val)}
            >
              {val}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Log() {
  const currentDateStr = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data: log, isLoading } = useGetDailyLog(currentDateStr, {
    query: {
      queryKey: getGetDailyLogQueryKey(currentDateStr),
      retry: false, // Don't retry if 404
    }
  });

  const createLog = useCreateDailyLog();
  const updateLog = useUpdateDailyLog();

  const [formData, setFormData] = useState({
    weight: "",
    steps: "",
    sleepHours: [7],
    workoutMinutes: "",
    workoutType: "",
    energy: 5,
    reflux: 0,
    postMealSleepiness: 0,
    headache: 0,
    stress: 0,
    muscleStiffness: 0,
    bowelMovement: "Normal",
    hungerBeforeLunch: 3,
    hungerBeforeDinner: 3,
    hungerBeforeBed: 3,
    water: 0,
    notes: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef(formData);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutateCreateRef = useRef(createLog.mutate);
  const mutateUpdateRef = useRef(updateLog.mutate);

  mutateCreateRef.current = createLog.mutate;
  mutateUpdateRef.current = updateLog.mutate;

  // Initialize
  useEffect(() => {
    if (log && initializedForId.current !== currentDateStr) {
      initializedForId.current = currentDateStr;
      const initialData = {
        weight: log.weight?.toString() || "",
        steps: log.steps?.toString() || "",
        sleepHours: [log.sleepHours || 7],
        workoutMinutes: log.workoutMinutes?.toString() || "",
        workoutType: log.workoutType || "",
        energy: log.energy || 5,
        reflux: log.reflux || 0,
        postMealSleepiness: log.postMealSleepiness || 0,
        headache: log.headache || 0,
        stress: log.stress || 0,
        muscleStiffness: log.muscleStiffness || 0,
        bowelMovement: log.bowelMovement || "Normal",
        hungerBeforeLunch: log.hungerBeforeLunch || 3,
        hungerBeforeDinner: log.hungerBeforeDinner || 3,
        hungerBeforeBed: log.hungerBeforeBed || 3,
        water: log.water || 0,
        notes: log.notes || ""
      };
      setFormData(initialData);
      lastSaved.current = initialData;
    } else if (!log && !isLoading && initializedForId.current !== currentDateStr) {
      // No log yet today
      initializedForId.current = currentDateStr;
      lastSaved.current = formData;
    }
  }, [log, isLoading, currentDateStr, formData]);

  const saveChanges = useCallback((dataToSave: typeof formData) => {
    setSaveStatus("saving");
    
    const payload = {
      date: currentDateStr,
      weight: dataToSave.weight ? parseFloat(dataToSave.weight) : null,
      steps: dataToSave.steps ? parseInt(dataToSave.steps) : null,
      sleepHours: dataToSave.sleepHours[0],
      workoutMinutes: dataToSave.workoutMinutes ? parseInt(dataToSave.workoutMinutes) : null,
      workoutType: dataToSave.workoutType || null,
      energy: dataToSave.energy,
      reflux: dataToSave.reflux,
      postMealSleepiness: dataToSave.postMealSleepiness,
      headache: dataToSave.headache,
      stress: dataToSave.stress,
      muscleStiffness: dataToSave.muscleStiffness,
      bowelMovement: dataToSave.bowelMovement,
      hungerBeforeLunch: dataToSave.hungerBeforeLunch,
      hungerBeforeDinner: dataToSave.hungerBeforeDinner,
      hungerBeforeBed: dataToSave.hungerBeforeBed,
      water: dataToSave.water,
      notes: dataToSave.notes
    };

    const onSuccess = (data: any) => {
      queryClient.setQueryData(getGetDailyLogQueryKey(currentDateStr), data);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    };
    const onError = () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    };

    if (log?.id) {
      mutateUpdateRef.current({ date: currentDateStr, data: payload }, { onSuccess, onError });
    } else {
      mutateCreateRef.current({ data: payload }, { onSuccess, onError });
    }
  }, [currentDateStr, log?.id, queryClient]);

  // Auto-save effect
  useEffect(() => {
    if (initializedForId.current !== currentDateStr) return;
    
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(lastSaved.current);
    
    if (hasChanged) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      setSaveStatus("saving");
      saveTimeout.current = setTimeout(() => {
        saveChanges(formData);
        lastSaved.current = formData;
      }, 1000);
    }
    
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [formData, currentDateStr, saveChanges]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addWater = (amount: number) => {
    setFormData(prev => ({ ...prev, water: (prev.water || 0) + amount }));
  };

  if (isLoading && !log) {
    return <div className="p-6 text-center text-muted-foreground mt-20">Loading log...</div>;
  }

  return (
    <div className="pb-24 bg-background min-h-screen">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-secondary tracking-widest uppercase">सेहत</p>
          <h1 className="text-xl font-serif text-foreground">{format(new Date(), "MMM d, yyyy")}</h1>
        </div>
        <div className="text-xs font-medium flex items-center gap-1 h-6">
          {saveStatus === "saving" && <span className="text-muted-foreground animate-pulse">Saving...</span>}
          {saveStatus === "saved" && <><Check className="w-3 h-3 text-primary" /><span className="text-primary">Saved</span></>}
        </div>
      </header>

      <div className="p-5 space-y-8">
        
        {/* Vitals */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Vitals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input 
                id="weight" 
                type="number" 
                value={formData.weight}
                onChange={e => handleChange("weight", e.target.value)}
                placeholder="e.g. 70"
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="steps">Steps</Label>
              <Input 
                id="steps" 
                type="number" 
                value={formData.steps}
                onChange={e => handleChange("steps", e.target.value)}
                placeholder="e.g. 10000"
                className="bg-card"
              />
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <Label>Sleep</Label>
              <span className="text-sm font-medium text-primary">{formData.sleepHours[0]} hrs</span>
            </div>
            <Slider
              value={formData.sleepHours}
              onValueChange={v => handleChange("sleepHours", v)}
              max={12}
              min={4}
              step={0.5}
              className="py-2"
            />
          </div>
        </section>

        {/* Symptoms */}
        <section className="space-y-2 bg-card border border-card-border p-4 rounded-2xl shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-3">Symptoms & Energy</h2>
          <SymptomRow label="Energy" value={formData.energy} onChange={v => handleChange("energy", v)} />
          <SymptomRow label="Reflux" value={formData.reflux} onChange={v => handleChange("reflux", v)} />
          <SymptomRow label="Post-meal Sleepiness" value={formData.postMealSleepiness} onChange={v => handleChange("postMealSleepiness", v)} />
          <SymptomRow label="Headache" value={formData.headache} onChange={v => handleChange("headache", v)} />
          <SymptomRow label="Stress" value={formData.stress} onChange={v => handleChange("stress", v)} />
        </section>

        {/* Digestion */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Digestion</h2>
          <div className="space-y-2">
            <Label>Bowel Movement</Label>
            <div className="flex flex-wrap gap-2">
              {["None", "Soft", "Normal", "Hard", "Multiple"].map(type => (
                <button
                  key={type}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium transition-colors border",
                    formData.bowelMovement === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-card-border hover:bg-accent"
                  )}
                  onClick={() => handleChange("bowelMovement", type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="space-y-1.5 text-center">
              <Label className="text-[10px] uppercase block mb-1">Hunger (Lunch)</Label>
              <div className="flex justify-center gap-1">
                {[1,3,5].map(v => (
                  <div key={v} onClick={() => handleChange("hungerBeforeLunch", v)} className={cn("w-6 h-6 rounded border flex items-center justify-center text-xs font-medium cursor-pointer", formData.hungerBeforeLunch === v ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground")}>{v}</div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 text-center">
              <Label className="text-[10px] uppercase block mb-1">Hunger (Dinner)</Label>
              <div className="flex justify-center gap-1">
                {[1,3,5].map(v => (
                  <div key={v} onClick={() => handleChange("hungerBeforeDinner", v)} className={cn("w-6 h-6 rounded border flex items-center justify-center text-xs font-medium cursor-pointer", formData.hungerBeforeDinner === v ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground")}>{v}</div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 text-center">
              <Label className="text-[10px] uppercase block mb-1">Hunger (Bed)</Label>
              <div className="flex justify-center gap-1">
                {[1,3,5].map(v => (
                  <div key={v} onClick={() => handleChange("hungerBeforeBed", v)} className={cn("w-6 h-6 rounded border flex items-center justify-center text-xs font-medium cursor-pointer", formData.hungerBeforeBed === v ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground")}>{v}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Water */}
        <section className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-blue-800">Water</h2>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formData.water} <span className="text-sm font-normal text-blue-600">ml</span></p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 flex items-center justify-center">
               <span className="text-xs font-semibold text-blue-600">{Math.min(100, Math.round((formData.water / 2500) * 100))}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => addWater(250)}>
              + 250ml
            </Button>
            <Button variant="outline" className="flex-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => addWater(500)}>
              + 500ml
            </Button>
          </div>
        </section>

        {/* Workout */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Workout</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="workoutType">Type</Label>
              <Input 
                id="workoutType" 
                value={formData.workoutType}
                onChange={e => handleChange("workoutType", e.target.value)}
                placeholder="e.g. Yoga, Walk"
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workoutMinutes">Duration (min)</Label>
              <Input 
                id="workoutMinutes" 
                type="number" 
                value={formData.workoutMinutes}
                onChange={e => handleChange("workoutMinutes", e.target.value)}
                placeholder="e.g. 45"
                className="bg-card"
              />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea 
            id="notes" 
            value={formData.notes}
            onChange={e => handleChange("notes", e.target.value)}
            placeholder="How are you feeling today?"
            className="min-h-[100px] resize-none bg-card"
          />
        </section>

      </div>
    </div>
  );
}
