import { useState } from "react";
import { format } from "date-fns";
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { 
  useAdvisorCheck, 
  useGetDashboardToday, 
  getGetDashboardTodayQueryKey,
  AdvisorResponse
} from "@workspace/api-client-react";
import { usePlan } from "@/components/plan-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COMMON_QUESTIONS = [
  "Is my portion okay?",
  "Can I add more chicken?",
  "Should I skip the rice?",
  "Is this good for iron?"
];

export default function Advisor() {
  const { plan, isPro, advisorUsageThisMonth, advisorMonthlyLimit, isLoading: planLoading } = usePlan();
  const { toast } = useToast();
  
  const currentDateStr = format(new Date(), "yyyy-MM-dd");
  const { data: dashboard } = useGetDashboardToday({
    query: {
      queryKey: getGetDashboardTodayQueryKey()
    }
  });

  const checkAdvisor = useAdvisorCheck();
  
  const [foodName, setFoodName] = useState("");
  const [portion, setPortion] = useState("");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AdvisorResponse | null>(null);

  const isLimitReached = !isPro && advisorUsageThisMonth >= advisorMonthlyLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || isLimitReached) return;
    
    checkAdvisor.mutate({
      data: {
        date: currentDateStr,
        question,
        foodName: foodName || undefined,
        portionDescription: portion || undefined
      }
    }, {
      onSuccess: (data) => {
        setResponse(data);
      },
      onError: () => {
        toast({ variant: "destructive", description: "Advisor check failed. Please try again." });
      }
    });
  };

  const handleChipClick = (q: string) => {
    setQuestion(q);
  };

  const cals = dashboard?.calories;
  const prot = dashboard?.protein;
  const wtr = dashboard?.water;

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border p-4">
        <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">सलाह</p>
        <h1 className="text-xl font-serif text-foreground font-medium flex items-center gap-2">
          Your Meal Guide <Sparkles className="w-4 h-4 text-secondary" />
        </h1>
      </header>

      <div className="p-4 space-y-6 mt-2">
        {/* Remaining Targets Panel */}
        <section className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-90">Remaining Today</h2>
          <div className="flex justify-between items-center text-center px-2">
            <div>
              <p className="text-2xl font-bold">{cals?.remaining || 0}</p>
              <p className="text-[10px] opacity-80 uppercase">Calories</p>
            </div>
            <div className="w-px h-8 bg-primary-foreground/20" />
            <div>
              <p className="text-2xl font-bold">{prot?.remaining || 0}g</p>
              <p className="text-[10px] opacity-80 uppercase">Protein</p>
            </div>
            <div className="w-px h-8 bg-primary-foreground/20" />
            <div>
              <p className="text-2xl font-bold">{wtr?.remaining || 0}ml</p>
              <p className="text-[10px] opacity-80 uppercase">Water</p>
            </div>
          </div>
        </section>

        {!isPro && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">Free Plan</span>
            <span className={cn("font-medium", isLimitReached ? "text-destructive" : "text-foreground")}>
              {advisorUsageThisMonth} of {advisorMonthlyLimit} checks used
            </span>
          </div>
        )}

        {isLimitReached ? (
          <div className="bg-card border border-primary/20 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto text-secondary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif mb-2">Monthly Limit Reached</h3>
              <p className="text-sm text-muted-foreground">Upgrade to Svasth Pro for unlimited AI advisor checks and advanced personalized insights.</p>
            </div>
            <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-2">
              Upgrade to Pro (₹299/mo)
            </Button>
          </div>
        ) : (
          <>
            {/* Common Questions */}
            <section className="flex flex-wrap gap-2">
              {COMMON_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleChipClick(q)}
                  className="bg-card border border-card-border px-3 py-1.5 rounded-full text-xs text-foreground font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </section>

            {/* Query Form */}
            <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-card-border p-4 rounded-2xl shadow-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Food (Optional)</Label>
                  <Input 
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    placeholder="e.g. Paneer Tikka"
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Portion (Optional)</Label>
                  <Input 
                    value={portion}
                    onChange={e => setPortion(e.target.value)}
                    placeholder="e.g. 1 bowl"
                    className="bg-background text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What's your question?</Label>
                <Textarea 
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Ask anything about your meal..."
                  className="min-h-[80px] resize-none bg-background text-sm"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={!question || checkAdvisor.isPending}>
                {checkAdvisor.isPending ? "Asking Advisor..." : "Ask Advisor"}
              </Button>
            </form>
          </>
        )}

        {/* Advisor Response */}
        {response && (
          <section className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
              "px-4 py-3 flex items-center gap-2 border-b",
              response.decision === "go_ahead" && "bg-green-50 border-green-100 text-green-800",
              response.decision === "reduce_portion" && "bg-amber-50 border-amber-100 text-amber-800",
              response.decision === "skip" && "bg-red-50 border-red-100 text-red-800",
              response.decision === "adjust" && "bg-blue-50 border-blue-100 text-blue-800",
            )}>
              {response.decision === "go_ahead" && <CheckCircle2 className="w-5 h-5" />}
              {response.decision === "reduce_portion" && <AlertTriangle className="w-5 h-5" />}
              {response.decision === "skip" && <AlertCircle className="w-5 h-5" />}
              {response.decision === "adjust" && <Info className="w-5 h-5" />}
              <span className="font-bold text-sm tracking-wide uppercase">
                {response.decision === "go_ahead" ? "Go Ahead" :
                 response.decision === "reduce_portion" ? "Reduce Portion" :
                 response.decision === "skip" ? "Skip" : "Adjust"}
              </span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                {response.explanation}
              </p>
              
              {response.tips && response.tips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tips</h4>
                  <ul className="space-y-1.5">
                    {response.tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-foreground">
                        <span className="text-secondary mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
