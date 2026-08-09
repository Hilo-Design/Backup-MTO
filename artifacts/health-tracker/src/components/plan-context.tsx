import { createContext, useContext, ReactNode } from "react";
import { useGetPlan } from "@workspace/api-client-react";

type PlanContextType = {
  plan: string;
  isPro: boolean;
  advisorUsageThisMonth: number;
  advisorMonthlyLimit: number;
  betaProAccess: boolean;
  isLoading: boolean;
};

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { data: planInfo, isLoading } = useGetPlan({
    query: {
      queryKey: ["plan"],
    },
  });

  const plan = planInfo?.plan || "free";
  const betaProAccess = planInfo?.betaProAccess || false;
  const isPro = plan === "pro" || betaProAccess;
  const advisorUsageThisMonth = planInfo?.advisorUsageThisMonth || 0;
  const advisorMonthlyLimit = planInfo?.advisorMonthlyLimit || 5;

  return (
    <PlanContext.Provider
      value={{
        plan,
        isPro,
        advisorUsageThisMonth,
        advisorMonthlyLimit,
        betaProAccess,
        isLoading,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}
