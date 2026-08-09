import { useState, useEffect, useRef } from "react";
import { useClerk } from "@clerk/react";
import { Download, Save, ShieldCheck, Upload, Loader2, LogOut, ExternalLink } from "lucide-react";
import { 
  useGetTargets, getGetTargetsQueryKey, useUpdateTargets,
  useGetHealthProfile, getGetHealthProfileQueryKey, useUpsertHealthProfile,
  useExportDailyLogs, getExportDailyLogsQueryKey,
  useExportMealLogs, getExportMealLogsQueryKey,
  useImportExcel,
} from "@workspace/api-client-react";
import { usePlan } from "@/components/plan-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

export default function Profile() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const { plan, isPro, betaProAccess, advisorUsageThisMonth, advisorMonthlyLimit } = usePlan();
  const { toast } = useToast();
  
  const { data: targets } = useGetTargets({ query: { queryKey: getGetTargetsQueryKey() } });
  const { data: profile } = useGetHealthProfile({ query: { queryKey: getGetHealthProfileQueryKey() } });
  
  const updateTargets = useUpdateTargets();
  const updateProfile = useUpsertHealthProfile();
  
  const exportLogsParams = { startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd') };
  const exportMealsParams = { startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd') };
  const { refetch: exportLogs } = useExportDailyLogs(exportLogsParams, { query: { enabled: false, queryKey: getExportDailyLogsQueryKey(exportLogsParams) } });
  const { refetch: exportMeals } = useExportMealLogs(exportMealsParams, { query: { enabled: false, queryKey: getExportMealLogsQueryKey(exportMealsParams) } });

  // Stripe price query
  const { data: priceData } = useQuery({
    queryKey: ["stripe-price"],
    queryFn: () => apiFetch("/stripe/price"),
    staleTime: 1000 * 60 * 60, // cache 1 hour
    retry: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) =>
      apiFetch("/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ variant: "destructive", description: "Could not start checkout. Please try again." });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiFetch("/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ variant: "destructive", description: "Could not open billing portal. Please try again." });
    },
  });

  // Handle checkout redirect success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast({ description: "🎉 Welcome to Svasth Pro! Your subscription is now active." });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      // Remove the query param
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, [queryClient, toast]);

  const [tData, setTData] = useState({
    caloriesTarget: "", proteinTarget: "", carbsTarget: "", fatTarget: "", fiberTarget: "", waterTarget: "", stepsTarget: ""
  });
  
  const [pData, setPData] = useState({
    ferritin: "", hemoglobin: "", vitaminB12: "", vitaminD: "", hba1c: "", 
    totalCholesterol: "", ldl: "", hdl: "", triglycerides: "", labDate: ""
  });

  useEffect(() => {
    if (targets) {
      setTData({
        caloriesTarget: targets.caloriesTarget?.toString() || "",
        proteinTarget: targets.proteinTarget?.toString() || "",
        carbsTarget: targets.carbsTarget?.toString() || "",
        fatTarget: targets.fatTarget?.toString() || "",
        fiberTarget: targets.fiberTarget?.toString() || "",
        waterTarget: targets.waterTarget?.toString() || "",
        stepsTarget: targets.stepsTarget?.toString() || ""
      });
    }
  }, [targets]);

  useEffect(() => {
    if (profile) {
      setPData({
        ferritin: profile.ferritin?.toString() || "",
        hemoglobin: profile.hemoglobin?.toString() || "",
        vitaminB12: profile.vitaminB12?.toString() || "",
        vitaminD: profile.vitaminD?.toString() || "",
        hba1c: profile.hba1c?.toString() || "",
        totalCholesterol: profile.totalCholesterol?.toString() || "",
        ldl: profile.ldl?.toString() || "",
        hdl: profile.hdl?.toString() || "",
        triglycerides: profile.triglycerides?.toString() || "",
        labDate: profile.labDate || ""
      });
    }
  }, [profile]);

  const handleSaveTargets = () => {
    updateTargets.mutate({
      data: {
        caloriesTarget: parseInt(tData.caloriesTarget) || 2000,
        proteinTarget: parseInt(tData.proteinTarget) || 50,
        carbsTarget: parseInt(tData.carbsTarget) || 250,
        fatTarget: parseInt(tData.fatTarget) || null,
        fiberTarget: parseInt(tData.fiberTarget) || 30,
        waterTarget: parseInt(tData.waterTarget) || 2500,
        stepsTarget: parseInt(tData.stepsTarget) || null,
      }
    }, {
      onSuccess: () => {
        toast({ description: "Targets updated" });
        queryClient.invalidateQueries({ queryKey: getGetTargetsQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to save targets. Please try again." });
      }
    });
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      data: {
        ferritin: parseFloat(pData.ferritin) || null,
        hemoglobin: parseFloat(pData.hemoglobin) || null,
        vitaminB12: parseFloat(pData.vitaminB12) || null,
        vitaminD: parseFloat(pData.vitaminD) || null,
        hba1c: parseFloat(pData.hba1c) || null,
        totalCholesterol: parseFloat(pData.totalCholesterol) || null,
        ldl: parseFloat(pData.ldl) || null,
        hdl: parseFloat(pData.hdl) || null,
        triglycerides: parseFloat(pData.triglycerides) || null,
        labDate: pData.labDate || null
      }
    }, {
      onSuccess: () => {
        toast({ description: "Lab values updated" });
        queryClient.invalidateQueries({ queryKey: getGetHealthProfileQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to save lab values. Please try again." });
      }
    });
  };


  const handleExport = async (type: 'logs' | 'meals') => {
    try {
      const result = type === 'logs' ? await exportLogs() : await exportMeals();
      if (result.data) {
        const blob = new Blob([result.data as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svasth_${type}_export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast({ description: "Export successful" });
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Export failed" });
    }
  };

  const priceLabel = priceData?.unitAmount
    ? `₹${Math.round(priceData.unitAmount / 100)}/mo`
    : "₹299/mo";

  const handleUpgrade = () => {
    if (!priceData?.priceId) {
      toast({ variant: "destructive", description: "Price info not loaded yet. Please try again." });
      return;
    }
    checkoutMutation.mutate(priceData.priceId);
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border p-4">
        <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">प्रोफाइल</p>
        <h1 className="text-xl font-serif text-foreground font-medium">Profile</h1>
      </header>

      <div className="p-4 space-y-8">
        
        {/* Plan & Usage */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Account</h2>
            <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold tracking-wider">
              {isPro ? "PRO" : "FREE"}
            </div>
          </div>
          
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-xs space-y-4">
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm">Advisor Checks Used</span>
              <span className="text-sm font-medium">{advisorUsageThisMonth} / {isPro ? '∞' : advisorMonthlyLimit}</span>
            </div>
          </div>
          
          {isPro ? (
            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Svasth Pro Active</p>
                  <p className="text-xs text-muted-foreground">Unlimited advisor checks &amp; all features unlocked</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ExternalLink className="w-3 h-3 mr-1" /> Manage</>}
              </Button>
            </div>
          ) : (
            <div className="mt-4 bg-gradient-to-r from-secondary/10 to-primary/10 border border-primary/20 rounded-2xl p-5 shadow-sm text-center">
              <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-serif mb-1">Svasth Pro</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Unlimited AI advisor checks, 12-week trend analysis, and an ad-free experience.
              </p>
              <Button
                className="w-full h-11"
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting...</>
                  : `Upgrade for ${priceLabel}`}
              </Button>
            </div>
          )}
        </section>

        {/* Daily Targets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Daily Targets</h2>
            <Button variant="ghost" size="sm" onClick={handleSaveTargets} disabled={updateTargets.isPending} className="h-8 text-xs text-primary">
              <Save className="w-3 h-3 mr-1" /> {updateTargets.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-xs grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Calories (kcal)</Label>
              <Input type="number" value={tData.caloriesTarget} onChange={e => setTData(p => ({...p, caloriesTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Protein (g)</Label>
              <Input type="number" value={tData.proteinTarget} onChange={e => setTData(p => ({...p, proteinTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Carbs (g)</Label>
              <Input type="number" value={tData.carbsTarget} onChange={e => setTData(p => ({...p, carbsTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fat (g)</Label>
              <Input type="number" value={tData.fatTarget} onChange={e => setTData(p => ({...p, fatTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fiber (g)</Label>
              <Input type="number" value={tData.fiberTarget} onChange={e => setTData(p => ({...p, fiberTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Water (ml)</Label>
              <Input type="number" value={tData.waterTarget} onChange={e => setTData(p => ({...p, waterTarget: e.target.value}))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Steps</Label>
              <Input type="number" value={tData.stepsTarget} onChange={e => setTData(p => ({...p, stepsTarget: e.target.value}))} />
            </div>
          </div>
        </section>

        {/* Lab Values */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Lab Values</h2>
            <Button variant="ghost" size="sm" onClick={handleSaveProfile} disabled={updateProfile.isPending} className="h-8 text-xs text-primary">
              <Save className="w-3 h-3 mr-1" /> {updateProfile.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4 italic">For tracking only — not a medical diagnosis.</p>
          
          <div className="bg-card border border-card-border rounded-2xl p-4 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Lab Date</Label>
              <Input type="date" value={pData.labDate} onChange={e => setPData(p => ({...p, labDate: e.target.value}))} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">HbA1c (%)</Label>
                <Input type="number" step="0.1" value={pData.hba1c} onChange={e => setPData(p => ({...p, hba1c: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vitamin B12 (pg/mL)</Label>
                <Input type="number" value={pData.vitaminB12} onChange={e => setPData(p => ({...p, vitaminB12: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vitamin D (ng/mL)</Label>
                <Input type="number" value={pData.vitaminD} onChange={e => setPData(p => ({...p, vitaminD: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ferritin (ng/mL)</Label>
                <Input type="number" value={pData.ferritin} onChange={e => setPData(p => ({...p, ferritin: e.target.value}))} />
              </div>
              
              <div className="col-span-2 pt-2 border-t border-border mt-2">
                <Label className="text-[10px] uppercase text-muted-foreground mb-2 block">Lipid Panel</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Cholesterol</Label>
                <Input type="number" value={pData.totalCholesterol} onChange={e => setPData(p => ({...p, totalCholesterol: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Triglycerides</Label>
                <Input type="number" value={pData.triglycerides} onChange={e => setPData(p => ({...p, triglycerides: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">LDL</Label>
                <Input type="number" value={pData.ldl} onChange={e => setPData(p => ({...p, ldl: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">HDL</Label>
                <Input type="number" value={pData.hdl} onChange={e => setPData(p => ({...p, hdl: e.target.value}))} />
              </div>
            </div>
          </div>
        </section>

        {/* Import Data */}
        <ImportDataSection />

        {/* Export Data */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Export Data</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full bg-card" onClick={() => handleExport('logs')}>
              <Download className="w-4 h-4 mr-2" /> Download Daily Logs CSV
            </Button>
            <Button variant="outline" className="w-full bg-card" onClick={() => handleExport('meals')}>
              <Download className="w-4 h-4 mr-2" /> Download Meals CSV
            </Button>
          </div>
        </section>

        <section>
          <Button
            variant="outline"
            className="w-full bg-card text-destructive"
            onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </section>

        <footer className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground">Svasth v1.0 — Your personal health companion</p>
        </footer>
      </div>
    </div>
  );
}


function ImportDataSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const importExcel = useImportExcel();

  const onFile = async (file: File | null) => {
    if (!file || importing) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ variant: "destructive", description: "File too large — max 15MB." });
      return;
    }
    setImporting(true);
    try {
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      importExcel.mutate(
        { data: { fileBase64, fileName: file.name } },
        {
          onSuccess: (result) => {
            setImporting(false);
            queryClient.invalidateQueries();
            const parts = [];
            if (result.dailyLogsImported) parts.push(`${result.dailyLogsImported} daily logs`);
            if (result.mealsImported) parts.push(`${result.mealsImported} meals`);
            toast({
              description: parts.length
                ? `Imported ${parts.join(" & ")}${result.skippedRows ? ` (${result.skippedRows} rows skipped)` : ""} ✓`
                : "No importable rows found — check that your sheet has a date column.",
            });
            if (result.warnings?.length) {
              toast({ description: result.warnings.join(" ") });
            }
          },
          onError: () => {
            setImporting(false);
            toast({ variant: "destructive", description: "Import failed — please check the file format and try again." });
          },
        },
      );
    } catch {
      setImporting(false);
      toast({ variant: "destructive", description: "Could not read the file." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Import Data</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Upload your Excel/CSV health history (daily logs &amp; meals). Columns like date, calories, water, steps, weight, sleep, reflux, energy are detected automatically.
      </p>
      <Button
        variant="outline"
        className="w-full bg-card"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        data-testid="button-import-excel"
      >
        {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        {importing ? "Importing…" : "Upload Excel / CSV"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </section>
  );
}

const BASE_URL = import.meta.env.BASE_URL ?? "/health-tracker/";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}api${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
