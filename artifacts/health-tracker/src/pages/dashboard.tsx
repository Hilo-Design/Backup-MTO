import { useGetDashboardToday, getGetDashboardTodayQueryKey, useGetDashboardStreak, getGetDashboardStreakQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Flame, Plus } from "lucide-react";
import { Link } from "wouter";
import { CircularProgress, ProgressBar } from "@/components/ui/progress-rings";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AiComposer } from "@/components/ai-composer";

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex justify-center space-x-4">
        <Skeleton className="h-[120px] w-[120px] rounded-full" />
        <div className="space-y-4">
          <Skeleton className="h-[80px] w-[80px] rounded-full" />
          <Skeleton className="h-[80px] w-[80px] rounded-full" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const { data: today, isLoading: loadingToday } = useGetDashboardToday({
    query: {
      queryKey: getGetDashboardTodayQueryKey(),
    }
  });

  const { data: streak } = useGetDashboardStreak({
    query: {
      queryKey: getGetDashboardStreakQueryKey(),
    }
  });

  if (loadingToday) return <DashboardSkeleton />;

  const currentDate = new Date();
  
  const cals = today?.calories;
  const prot = today?.protein;
  const wtr = today?.water;
  const crb = today?.carbs;
  const fbr = today?.fiber;

  const mealSlots = [
    { type: "Breakfast", label: "Breakfast" },
    { type: "Lunch", label: "Lunch" },
    { type: "Snack", label: "Snack" },
    { type: "Dinner", label: "Dinner" },
  ];

  return (
    <div className="pb-44 relative">
      <AiComposer />
      <div className="p-6 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">
              आज का सारांश
            </p>
            <h1 className="text-2xl font-serif text-foreground font-medium">
              नमस्ते
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(currentDate, "EEEE, MMMM d")}
            </p>
          </div>
          {streak && streak.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-card border border-card-border px-3 py-1.5 rounded-full shadow-xs">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold">{streak.currentStreak} Day</span>
            </div>
          )}
        </header>

        {/* Rings */}
        <section className="flex flex-row items-center justify-between px-2">
          <CircularProgress 
            value={cals?.consumed || 0} 
            max={cals?.target || 2000} 
            label="Calories" 
            sublabel="kcal"
            size={140}
            strokeWidth={12}
            color="text-primary"
          />
          <div className="flex flex-col gap-4">
            <CircularProgress 
              value={prot?.consumed || 0} 
              max={prot?.target || 50} 
              label="Protein" 
              sublabel="g"
              size={90}
              strokeWidth={8}
              color="text-secondary"
            />
            <CircularProgress 
              value={wtr?.consumed || 0} 
              max={wtr?.target || 2500} 
              label="Water" 
              sublabel="ml"
              size={90}
              strokeWidth={8}
              color="text-blue-500"
            />
          </div>
        </section>

        {/* Progress Bars */}
        <section className="bg-card rounded-2xl p-5 border border-card-border shadow-xs space-y-4">
          <ProgressBar 
            value={crb?.consumed || 0} 
            max={crb?.target || 250} 
            label="Carbs (g)" 
            color="bg-primary/80"
          />
          <ProgressBar 
            value={fbr?.consumed || 0} 
            max={fbr?.target || 30} 
            label="Fiber (g)" 
            color="bg-secondary"
          />
        </section>

        {/* Meal Slots */}
        <section>
          <h2 className="text-lg font-serif mb-3">Meals</h2>
          <div className="grid grid-cols-2 gap-3">
            {mealSlots.map((slot) => {
              const meal = today?.meals?.find(m => m.mealType.toLowerCase() === slot.type.toLowerCase());
              return (
                <Card key={slot.type} className="bg-card border-card-border shadow-xs">
                  <CardContent className="p-3">
                    <h3 className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                      {slot.label}
                    </h3>
                    {meal ? (
                      <div>
                        <p className="font-semibold text-sm">{meal.totalCalories || 0} kcal</p>
                        <p className="text-xs text-muted-foreground">{meal.totalProtein || 0}g protein</p>
                      </div>
                    ) : (
                      <Link href="/meals">
                        <Button variant="ghost" size="sm" className="w-full h-8 text-primary bg-primary/5 hover:bg-primary/10">
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Key Stats Row */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-serif">Today's Log</h2>
            <Link href="/log" className="text-xs text-primary font-medium hover:underline">
              Edit
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-card-border rounded-xl p-3 text-center shadow-xs">
              <span className="block text-[10px] text-muted-foreground uppercase mb-1">Energy</span>
              <span className="font-semibold text-foreground">{today?.dailyLog?.energy || '-'}</span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center shadow-xs">
              <span className="block text-[10px] text-muted-foreground uppercase mb-1">Reflux</span>
              <span className="font-semibold text-foreground">{today?.dailyLog?.reflux || '-'}</span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center shadow-xs">
              <span className="block text-[10px] text-muted-foreground uppercase mb-1">Sleep</span>
              <span className="font-semibold text-foreground">{today?.dailyLog?.sleepHours || '-'}</span>
              <span className="text-xs text-muted-foreground">hrs</span>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[96px] right-[calc(50%-195px)] md:right-[max(16px,calc(50%-195px))] z-40">
        <Link href="/log">
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
