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
      {/* Noise overlay to eliminate color banding - only on desktop */}
      <div
        className="hidden md:block fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle gradient orbs - only on desktop due to performance */}
      <div className="hidden md:block fixed -top-[200px] -right-[200px] w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="hidden md:block fixed -bottom-[150px] -left-[150px] w-[500px] h-[500px] bg-accent/5 blur-[130px] rounded-full pointer-events-none z-0" />

      {!hideNav && <DesktopNav />}
      {!hideNav && <MobileHeader />}
      <main className={`flex-1 overflow-y-auto overscroll-contain ${hideNav ? "" : "pt-[calc(56px+env(safe-area-inset-top))] md:pt-20"}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
