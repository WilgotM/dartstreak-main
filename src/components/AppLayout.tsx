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
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden relative">
      <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[200px] h-[200px] bg-orange-500/10 blur-[80px] rounded-full pointer-events-none z-0" />

      {!hideNav && <DesktopNav />}
      {!hideNav && <MobileHeader />}
      <main className={`flex-1 overflow-y-auto overscroll-contain ${hideNav ? "" : "pt-[calc(56px+env(safe-area-inset-top))] md:pt-20"}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
