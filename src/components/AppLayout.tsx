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
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {!hideNav && <DesktopNav />}
      {!hideNav && <MobileHeader />}
      <main className={`flex-1 overflow-y-auto overscroll-contain ${hideNav ? "" : "pt-[calc(56px+env(safe-area-inset-top))] md:pt-16"}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
