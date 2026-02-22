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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden app-shell-bg">
      <div className="pointer-events-none fixed inset-0 z-0 app-shell-noise" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[220px] bg-gradient-to-b from-black/30 via-black/12 to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[200px] bg-gradient-to-t from-black/22 via-black/8 to-transparent" />

      {!hideNav && <DesktopNav />}
      {!hideNav && <MobileHeader />}
      <main
        className={`relative z-[2] flex-1 overflow-y-auto overscroll-contain ${hideNav ? "" : "pt-[calc(60px+env(safe-area-inset-top))] md:pt-28"}`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
