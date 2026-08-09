import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Utensils, ClipboardList, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-muted/30 flex justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-[100dvh] relative shadow-2xl flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-[80px] scroll-smooth">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-[80px] bg-background border-t border-border px-4 flex items-center justify-between z-50">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 h-full transition-colors cursor-pointer",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn(isActive && "drop-shadow-sm")}
                  />
                  <span className={cn("text-[10px] font-medium", isActive ? "font-semibold" : "")}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
