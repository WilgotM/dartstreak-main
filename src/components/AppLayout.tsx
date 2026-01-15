import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileHeader } from "@/components/MobileHeader";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {!hideNav && <DesktopNav />}
      {!hideNav && <MobileHeader />}
      <div className={hideNav ? "" : "pb-20 pt-[calc(3.5rem+env(safe-area-inset-top))] md:pb-0 md:pt-16"}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
