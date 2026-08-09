import { useRef, useState } from "react";
import { format, subDays, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Camera, Sparkles, X } from "lucide-react";
import {
  useGetMeals,
  getGetMealsQueryKey,
  useCreateMeal,
  useDeleteMeal,
  useCreateFoodItem,
  useDeleteFoodItem,
  useAnalyzeMealPhoto,
  MealPhotoAnalysis,
  Meal,
  FoodItem
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlan } from "@/components/plan-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose, DrawerFooter } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function MealSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export default function Meals() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data: meals, isLoading } = useGetMeals({ date: dateStr }, {
    query: {
      queryKey: getGetMealsQueryKey({ date: dateStr })
    }
  });

  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const { toast } = useToast();

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [newMealType, setNewMealType] = useState("Breakfast");
  const [newMealNotes, setNewMealNotes] = useState("");
  const [analysis, setAnalysis] = useState<MealPhotoAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const resetDrawer = () => {
    setNewMealNotes("");
    setAnalysis(null);
    setAnalyzing(false);
  };

  const handleCreateMeal = () => {
    const fromPhoto = analysis && analysis.foodItems.length > 0;
    createMeal.mutate({
      data: {
        date: dateStr,
        mealType: newMealType,
        notes: newMealNotes || (fromPhoto ? analysis!.dishName : ""),
        ...(fromPhoto ? {
          totalCalories: analysis!.totalCalories,
          totalProtein: analysis!.totalProtein,
          totalCarbs: analysis!.totalCarbs,
          totalFat: analysis!.totalFat,
          totalFiber: analysis!.totalFiber,
          // mealId is replaced server-side with the newly created meal's id
          foodItems: analysis!.foodItems.map(fi => ({ ...fi, mealId: 0 })),
        } : {}),
      }
    }, {
      onSuccess: () => {
        setIsAddDrawerOpen(false);
        resetDrawer();
        queryClient.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: dateStr }) });
      },
      onError: () => {
        toast({ variant: "destructive", description: "Could not add meal. Please try again." });
      }
    });
  };

  const handleDeleteMeal = (id: number) => {
    if (confirm("Delete this meal?")) {
      deleteMeal.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: dateStr }) });
        },
        onError: () => {
          toast({ variant: "destructive", description: "Could not delete meal." });
        }
      });
    }
  };

  const mealOrder = ["Breakfast", "Lunch", "Snack", "Dinner"];
  
  const sortedMeals = meals ? [...meals].sort((a, b) => {
    const aIdx = mealOrder.indexOf(a.mealType);
    const bIdx = mealOrder.indexOf(b.mealType);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  }) : [];

  return (
    <div className="pb-24">
      {/* Header with Date Picker */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border p-4">
        <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">खाना</p>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-serif text-foreground font-medium">
            {format(currentDate, "MMMM d, yyyy")}
          </h1>
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 text-muted-foreground" disabled={format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <MealSkeleton />
        ) : sortedMeals.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-serif text-foreground mb-2">No meals logged</h2>
            <p className="text-sm text-muted-foreground mb-6">Track your meals to see macro trends and get personalized advice.</p>
          </div>
        ) : (
          sortedMeals.map(meal => (
            <div key={meal.id} className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 flex items-start justify-between border-b border-border/40 bg-muted/20">
                <div>
                  <h3 className="font-semibold text-lg">{meal.mealType}</h3>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-medium">
                    <span><strong className="text-foreground">{meal.totalCalories || 0}</strong> kcal</span>
                    <span><strong className="text-foreground">{meal.totalProtein || 0}g</strong> prot</span>
                    <span><strong className="text-foreground">{meal.totalCarbs || 0}g</strong> carb</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteMeal(meal.id)}
                    disabled={deleteMeal.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-card">
                {meal.notes && <p className="text-sm italic text-muted-foreground mb-4">"{meal.notes}"</p>}
                
                {meal.foodItems && meal.foodItems.length > 0 ? (
                  <ul className="space-y-2">
                    {meal.foodItems.map(item => (
                      <li key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-border/40 last:border-0">
                        <span>{item.name} <span className="text-xs text-muted-foreground">({item.portion}{item.unit})</span></span>
                        <span className="font-medium text-xs">{item.calories || 0} kcal</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No specific foods added.</p>
                )}
                
                <AddFoodDrawer mealId={meal.id} dateStr={dateStr} />
              </div>
            </div>
          ))
        )}

        <Drawer open={isAddDrawerOpen} onOpenChange={(open) => { setIsAddDrawerOpen(open); if (!open) resetDrawer(); }}>
          <DrawerTrigger asChild>
            <Button className="w-full mt-4 h-12 rounded-xl text-md shadow-md gap-2" variant="default">
              <Plus className="w-5 h-5" /> Add Meal
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-w-[430px] mx-auto">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="font-serif text-xl">Log a Meal</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <div className="flex flex-wrap gap-2">
                  {mealOrder.map(type => (
                    <button
                      key={type}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                        newMealType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-card-border hover:bg-accent"
                      )}
                      onClick={() => setNewMealType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input 
                  placeholder="e.g. 2 eggs with toast" 
                  value={newMealNotes}
                  onChange={e => setNewMealNotes(e.target.value)}
                  className="bg-card"
                />
              </div>
              <PhotoAnalyzeSection
                analysis={analysis}
                onPendingChange={setAnalyzing}
                onAnalysis={(a) => {
                  setAnalysis(a);
                  if (a?.mealType) {
                    const match = mealOrder.find(t => t.toLowerCase() === a.mealType!.toLowerCase());
                    if (match) setNewMealType(match);
                  }
                }}
              />
            </div>
            <DrawerFooter className="pt-2">
              <Button onClick={handleCreateMeal} disabled={createMeal.isPending || analyzing}>
                {createMeal.isPending ? "Creating..." : analyzing ? "Analyzing photo..." : "Create Meal"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        
        {/* Promoted banner for Free tier */}
        <PromotedBanner />
      </div>
    </div>
  );
}

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

function PhotoAnalyzeSection({
  analysis,
  onAnalysis,
  onPendingChange,
}: {
  analysis: MealPhotoAnalysis | null;
  onAnalysis: (a: MealPhotoAnalysis | null) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Incremented on every new file selection / clear so responses from a
  // superseded upload are ignored (prevents a stale analysis reappearing).
  const requestIdRef = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const analyzePhoto = useAnalyzeMealPhoto();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const requestId = ++requestIdRef.current;
    onAnalysis(null);
    try {
      const { base64, mediaType } = await fileToCompressedBase64(file);
      if (requestId !== requestIdRef.current) return;
      setPreview(`data:${mediaType};base64,${base64}`);
      onPendingChange(true);
      analyzePhoto.mutate({ data: { imageBase64: base64, mediaType } }, {
        onSuccess: (result) => {
          if (requestId !== requestIdRef.current) return;
          onPendingChange(false);
          if (!result.foodItems.length) {
            toast({ variant: "destructive", description: result.notes || "No food detected in the photo." });
            return;
          }
          onAnalysis(result);
        },
        onError: () => {
          if (requestId !== requestIdRef.current) return;
          onPendingChange(false);
          toast({ variant: "destructive", description: "Photo analysis failed. Please try again." });
        },
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      onPendingChange(false);
      toast({ variant: "destructive", description: "Could not read that image. Try another photo." });
    }
  };

  const clear = () => {
    requestIdRef.current++;
    setPreview(null);
    onAnalysis(null);
    onPendingChange(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>Photo (optional)</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {!preview ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl border-dashed gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-4 h-4" /> Snap or upload a meal photo
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img src={preview} alt="Meal preview" className="w-full h-40 object-cover rounded-xl border border-card-border" />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 border border-border"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {analyzePhoto.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Sparkles className="w-4 h-4 text-secondary" /> Analyzing your meal…
            </div>
          )}
          {analysis && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                <p className="text-sm font-medium">{analysis.dishName}</p>
              </div>
              <ul className="space-y-1">
                {analysis.foodItems.map((fi, i) => (
                  <li key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{fi.name}{fi.portion ? ` (${fi.portion}${fi.unit ? ` ${fi.unit}` : ""})` : ""}</span>
                    <span>{fi.calories ?? "—"} kcal</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium text-foreground">
                ~{analysis.totalCalories ?? 0} kcal · {analysis.totalProtein ?? 0}g protein · {analysis.totalCarbs ?? 0}g carbs
              </p>
              <p className="text-[10px] text-muted-foreground">AI estimate — items will be added to this meal. Edit after saving if needed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddFoodDrawer({ mealId, dateStr }: { mealId: number, dateStr: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createFood = useCreateFoodItem();

  const [formData, setFormData] = useState({
    name: "",
    portion: "1",
    unit: "serving",
    calories: "",
    protein: "",
    carbs: ""
  });

  const handleAdd = () => {
    if (!formData.name) return;
    
    createFood.mutate({
      data: {
        mealId,
        name: formData.name,
        portion: parseFloat(formData.portion) || 1,
        unit: formData.unit,
        calories: formData.calories ? parseInt(formData.calories) : null,
        protein: formData.protein ? parseInt(formData.protein) : null,
        carbs: formData.carbs ? parseInt(formData.carbs) : null,
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        setFormData({ name: "", portion: "1", unit: "serving", calories: "", protein: "", carbs: "" });
        queryClient.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: dateStr }) });
      },
      onError: () => {
        // Toast not available in sub-component; show inline (createFood.isError will be true)
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs border-dashed">
          <Plus className="w-3 h-3 mr-1" /> Add Food Item
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-[430px] mx-auto">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="font-serif text-lg">Add Food Item</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Food Name</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData(p => ({...p, name: e.target.value}))}
              placeholder="e.g. Apple"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Portion</Label>
              <Input type="number" value={formData.portion} onChange={e => setFormData(p => ({...p, portion: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={formData.unit} onChange={e => setFormData(p => ({...p, unit: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Calories</Label>
              <Input type="number" value={formData.calories} onChange={e => setFormData(p => ({...p, calories: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Protein (g)</Label>
              <Input type="number" value={formData.protein} onChange={e => setFormData(p => ({...p, protein: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Carbs (g)</Label>
              <Input type="number" value={formData.carbs} onChange={e => setFormData(p => ({...p, carbs: e.target.value}))} />
            </div>
          </div>
        </div>
        <DrawerFooter className="pt-2">
          <Button onClick={handleAdd} disabled={createFood.isPending || !formData.name}>
            Add Item
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function PromotedBanner() {
  const { isPro, isLoading } = usePlan();
  
  if (isLoading || isPro) return null;
  
  return (
    <div className="mt-8 mb-4 bg-gradient-to-r from-secondary/10 to-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Promoted</p>
        <p className="text-sm font-medium text-foreground">Svasth Pro</p>
        <p className="text-xs text-muted-foreground mt-0.5">No ads, unlimited AI, deeper trends. ₹299/mo</p>
      </div>
      <Button size="sm" variant="secondary" className="h-8 text-xs shrink-0">Upgrade</Button>
    </div>
  );
}
