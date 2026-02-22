import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_LANGUAGES, resolveAppLanguage } from "@/i18n/languages";
import CountryFlagBadge from "@/components/CountryFlagBadge";

/**
 * A minimal, dark-themed language switcher designed specifically for the
 * landing page navbar. Renders as a subtle text toggle that opens a
 * compact flyout — no shadcn widgets, no clunky buttons.
 */
export function LandingLanguageSwitch() {
  const { i18n } = useTranslation();
  const activeLanguage = resolveAppLanguage(
    i18n.resolvedLanguage || i18n.language,
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get country code for flags
  const getCountryCode = (intlLocale: string) => {
    const territory = intlLocale.split("-")[1];
    if (intlLocale.startsWith("en")) return "GB";
    return territory || "GB";
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleChange = (code: string) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — just the language code, ultra-minimal */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-[#FAF8F5]/70 transition-all hover:text-[#22C55E] focus:outline-none"
        aria-label="Change language"
        aria-expanded={open}
      >
        <CountryFlagBadge
          countryCode={getCountryCode(activeLanguage.intlLocale)}
          size="sm"
          className="rounded-[1px] opacity-80"
        />
        <span className="uppercase tracking-wide text-xs font-bold">
          {activeLanguage.code}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Flyout */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-3 min-w-[180px] overflow-hidden rounded-xl border border-[#2A2A35] bg-[#16161C]/95 shadow-2xl backdrop-blur-xl"
          style={{
            animation: "landingLangFadeIn 150ms ease-out",
          }}
        >
          <style>{`
            @keyframes landingLangFadeIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="py-1.5 px-1.5">
            {APP_LANGUAGES.map((lang) => {
              const isActive = lang.code === activeLanguage.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleChange(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[#22C55E]/10 text-[#22C55E] font-semibold"
                      : "text-[#FAF8F5]/70 hover:bg-[#22C55E]/10 hover:text-[#FAF8F5]"
                  }`}
                >
                  <CountryFlagBadge
                    countryCode={getCountryCode(lang.intlLocale)}
                    size="sm"
                    className="rounded-[1px]"
                  />
                  <span className="flex-1">{lang.nativeName}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
