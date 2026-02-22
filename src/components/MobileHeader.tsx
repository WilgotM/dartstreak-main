import { LanguageSwitch } from "@/components/LanguageSwitch";

export function MobileHeader() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] md:hidden">
      <div className="mx-3 flex h-14 items-center justify-between rounded-b-2xl border border-t-0 border-white/10 bg-[#0D0D12]/92 px-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="DartStreak Logo" className="h-7 w-7 object-contain" />
          <span className="font-display text-base font-bold tracking-tight text-[#FAF8F5]">
            DartStreak
          </span>
        </div>
        <LanguageSwitch />
      </div>
    </nav>
  );
}
