import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { 
  useGetWeeklyTrends, 
  getGetWeeklyTrendsQueryKey 
} from "@workspace/api-client-react";
import { usePlan } from "@/components/plan-context";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function ChartCard({ title, data, dataKey, color, type = "area", unit = "" }: { 
  title: string; 
  data: any[]; 
  dataKey: string; 
  color: string; 
  type?: "line" | "area";
  unit?: string;
}) {
  return (
    <div className="bg-card border border-card-border p-4 rounded-2xl shadow-xs">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">{title}</h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                formatter={(value: number) => [`${value} ${unit}`, title]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
              />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${dataKey})`} dot={{ r: 3, fill: "hsl(var(--card))", stroke: color, strokeWidth: 2 }} activeDot={{ r: 5, fill: color }} />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                formatter={(value: number) => [`${value} ${unit}`, title]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--card))", stroke: color, strokeWidth: 2 }} activeDot={{ r: 5, fill: color }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Trends() {
  const { isPro } = usePlan();
  const [timeframe, setTimeframe] = useState<"4w" | "12w">("4w");
  
  const weeksToFetch = timeframe === "12w" ? 12 : 4;

  const { data: trendsData, isLoading } = useGetWeeklyTrends({ weeks: weeksToFetch }, {
    query: {
      queryKey: getGetWeeklyTrendsQueryKey({ weeks: weeksToFetch })
    }
  });

  const chartData = useMemo(() => {
    if (!trendsData?.weeks) return [];
    // API returns newest first, reverse for charts
    return [...trendsData.weeks].reverse().map(w => ({
      ...w,
      displayDate: format(parseISO(w.weekStart), "MMM d")
    }));
  }, [trendsData]);

  const latestWeek = trendsData?.weeks?.[0];

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">रुझान</p>
          <h1 className="text-xl font-serif text-foreground font-medium">Trends</h1>
        </div>
        <div className="bg-muted p-1 rounded-lg flex text-xs font-medium">
          <button 
            className={`px-3 py-1 rounded-md transition-colors ${timeframe === "4w" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setTimeframe("4w")}
          >
            4 Weeks
          </button>
          <button 
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${timeframe === "12w" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => {
              if (isPro) setTimeframe("12w");
              else alert("Upgrade to Pro to see 12-week trends.");
            }}
          >
            12 Weeks {!isPro && <span className="text-[8px] bg-secondary/20 text-secondary px-1 py-0.5 rounded">PRO</span>}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Weekly Summary Stats */}
        {!isLoading && latestWeek && (
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">Avg Calories</p>
              <p className="text-2xl font-bold">{Math.round(latestWeek.avgCalories || 0)} <span className="text-sm font-normal opacity-80">kcal</span></p>
            </div>
            <div className="bg-secondary text-secondary-foreground p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">Avg Protein</p>
              <p className="text-2xl font-bold">{Math.round(latestWeek.avgProtein || 0)} <span className="text-sm font-normal opacity-80">g</span></p>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[250px] w-full rounded-2xl" />
            <Skeleton className="h-[250px] w-full rounded-2xl" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="space-y-6">
            <ChartCard 
              title="Calories (avg/day)" 
              data={chartData} 
              dataKey="avgCalories" 
              color="hsl(var(--primary))" 
              type="area" 
              unit="kcal" 
            />
            <ChartCard 
              title="Protein (avg/day)" 
              data={chartData} 
              dataKey="avgProtein" 
              color="hsl(var(--secondary))" 
              type="area" 
              unit="g" 
            />
            <ChartCard 
              title="Weight Trend" 
              data={chartData} 
              dataKey="avgWeight" 
              color="hsl(200 50% 40%)" 
              type="line" 
              unit="kg" 
            />
            <ChartCard 
              title="Energy Levels (0-10)" 
              data={chartData} 
              dataKey="avgEnergy" 
              color="hsl(26 75% 62%)" 
              type="line" 
              unit="/10" 
            />
            <ChartCard 
              title="Daily Steps (avg)" 
              data={chartData} 
              dataKey="avgSteps" 
              color="hsl(280 40% 45%)" 
              type="area" 
              unit="steps" 
            />
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            Not enough data to show trends yet.
          </div>
        )}

        {!isPro && (
          <div className="bg-card border border-primary/20 rounded-2xl p-5 text-center mt-8 shadow-sm">
            <h3 className="text-lg font-serif mb-2">Unlock 12-Week Trends</h3>
            <p className="text-sm text-muted-foreground mb-4">Upgrade to Svasth Pro for long-term insights and advanced analytics.</p>
            <Button className="w-full">Upgrade to Pro</Button>
          </div>
        )}
      </div>
    </div>
  );
}
