import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Crosshair, Map, MousePointer2, Target, Users, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useAuth } from "@/hooks/useAuth";

gsap.registerPlugin(ScrollTrigger);

const PALETTE = {
  primary: "#0D0D12",
  accent: "#22C55E", // Native Dartstreak Green (Green-500)
  bg: "#16161C",
  text: "#FAF8F5",
  slate: "#2A2A35",
};

// Global SVG Noise Filter
const NoiseOverlay = () => (
  <svg
    className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03]"
    style={{ mixBlendMode: "overlay" }}
  >
    <filter id="noiseFilter">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.65"
        numOctaves="3"
        stitchTiles="stitch"
      />
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
  </svg>
);

// --- A. NAVBAR ---
const Navbar = () => {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: "top -50",
        end: 99999,
        toggleClass: { className: "nav-scrolled", targets: navRef.current },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-6 left-1/2 z-40 flex w-[90%] max-w-5xl -translate-x-1/2 items-center justify-between rounded-[2rem] px-8 py-4 transition-all duration-500 ease-in-out [&.nav-scrolled]:border [&.nav-scrolled]:border-[#2A2A35] [&.nav-scrolled]:bg-[#0D0D12]/60 [&.nav-scrolled]:backdrop-blur-xl"
    >
      <div className="font-sans text-xl font-bold tracking-tight text-[#FAF8F5] flex items-center gap-2">
        <img src="/logo.png" alt="Dartstreak Logo" className="w-6 h-6 object-contain" />
        DartStreak
      </div>
      <div className="hidden gap-8 md:flex items-center">
        {[
          { id: "features", label: t("landing.navFeatures") },
          { id: "leagues", label: t("landing.navLeagues") },
          { id: "philosophy", label: t("landing.navPhilosophy") },
        ].map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="text-sm font-medium text-[#FAF8F5]/70 transition-all hover:-translate-y-[1px] hover:text-[#22C55E]"
          >
            {link.label}
          </a>
        ))}
        <div className="border-l border-[#2A2A35] pl-8">
            <LanguageSwitch />
        </div>
      </div>
      {session ? (
        <Link to="/dashboard" className="group relative overflow-hidden rounded-full bg-[#FAF8F5] px-6 py-2.5 text-sm font-semibold text-[#0D0D12] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]">
          <span className="relative z-10 transition-colors group-hover:text-[#FAF8F5]">
            {t("landing.dashboard")}
          </span>
          <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#22C55E] transition-transform duration-500 cubic-bezier(0.25, 0.46, 0.45, 0.94) group-hover:translate-x-0" />
        </Link>
      ) : (
        <Link to="/auth" className="group relative overflow-hidden rounded-full bg-[#FAF8F5] px-6 py-2.5 text-sm font-semibold text-[#0D0D12] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]">
          <span className="relative z-10 transition-colors group-hover:text-[#FAF8F5]">
            {t("landing.login")}
          </span>
          <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#22C55E] transition-transform duration-500 cubic-bezier(0.25, 0.46, 0.45, 0.94) group-hover:translate-x-0" />
        </Link>
      )}
    </nav>
  );
};

// --- B. HERO SECTION ---
const Hero = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-elem", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.2,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex h-[100dvh] items-end pb-24 lg:pb-32"
    >
      {/* Background image & gradient overlay */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <img
          src="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=2938&auto=format&fit=crop"
          alt="Dark architectural stadium texture"
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full px-6 md:px-16 lg:w-2/3 lg:px-24">
        <div className="hero-elem text-sm font-medium uppercase tracking-[0.2em] text-[#22C55E] mb-4">
          {t("landing.tagline")}
        </div>
        <h1 className="hero-elem mb-2 font-sans text-5xl font-bold tracking-tight text-[#FAF8F5] sm:text-7xl lg:text-8xl">
          {t("landing.heroTitle")}
        </h1>
        <h1 className="hero-elem mb-10 font-serif text-6xl italic text-[#FAF8F5] sm:text-8xl lg:text-[10rem] lg:leading-[0.85]">
          <span className="not-italic font-bold font-sans text-[#22C55E]">{t("landing.heroHighlight")}</span>
        </h1>
        <div className="hero-elem flex flex-wrap gap-4">
          {session ? (
            <Link
              to="/dashboard"
              className="group relative overflow-hidden rounded-full bg-[#22C55E] px-8 py-4 text-base font-bold text-[#0D0D12] shadow-xl transition-all duration-300 hover:scale-[1.03]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.dashboard")} <ArrowRight size={18} />
              </span>
              <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#FAF8F5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="group relative overflow-hidden rounded-full bg-[#22C55E] px-8 py-4 text-base font-bold text-[#0D0D12] shadow-xl transition-all duration-300 hover:scale-[1.03]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.createAccount")} <ArrowRight size={18} />
              </span>
              <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#FAF8F5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

// --- C. FEATURES ---

const ShufflerCard = () => {
  const { t } = useTranslation();
  const labels = [
    t("landing.leagueDetails"),
    t("landing.leaderboard"),
    t("landing.dashboard")
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % labels.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [labels.length]);

  return (
    <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl">
      <h3 className="mb-2 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.leaguesTitle")}
      </h3>
      <p className="font-sans text-sm text-[#FAF8F5]/60 mb-6 font-medium">
        {t("landing.whyUs3Desc")}
      </p>

      <div className="relative flex-1">
        {labels.map((label, idx) => {
          const offset = (idx - activeIndex + labels.length) % labels.length;
          const isVisible = offset < 3;

          return (
            <div
              key={idx}
              className="absolute left-0 w-full rounded-2xl border border-[#2A2A35] bg-[#0D0D12] p-4 text-sm font-mono text-[#FAF8F5] transition-all duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                top: `${offset * 15}%`,
                scale: 1 - offset * 0.05,
                opacity: isVisible ? 1 - offset * 0.3 : 0,
                zIndex: labels.length - offset,
                pointerEvents: offset === 0 ? "auto" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <Crosshair size={16} className="text-[#22C55E]" />
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TypewriterCard = () => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const fullText =
    `> ${t("landing.inProgress")}...\n> P1: T20, T20, D20\n> Score: 180\n> ${t("landing.calculating")}...`;

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        setTimeout(() => {
          index = 0;
        }, 2000);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl">
      <div className="absolute top-8 right-8 flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-[#22C55E]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
        {t("landing.liveMatches")}
      </div>
      <h3 className="mb-2 w-2/3 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.whyUs1Title")}
      </h3>
      <p className="font-sans text-sm text-[#FAF8F5]/60 mb-6 font-medium">
        {t("landing.whyUs1Desc")}
      </p>

      <div className="flex-1 rounded-2xl bg-[#0D0D12] p-6 text-sm font-mono text-[#22C55E]/80 shadow-inner">
        <pre className="whitespace-pre-wrap">
          {text}
          <span className="animate-pulse font-bold text-[#FAF8F5]">_</span>
        </pre>
      </div>
    </div>
  );
};

const SchedulerCard = () => {
  const { t } = useTranslation();
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });

      tl.to(".fake-cursor", { x: 90, y: 30, duration: 1, ease: "power2.inOut" })
        .to(".fake-cursor", {
          scale: 0.8,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
        })
        .to(
          ".day-cell-3",
          { backgroundColor: "#22C55E", color: "#0D0D12", duration: 0.2 },
          "-=0.1",
        )
        .to(".fake-cursor", {
          x: 140,
          y: 75,
          duration: 1,
          ease: "power2.inOut",
          delay: 0.5,
        })
        .to(".fake-cursor", {
          scale: 0.8,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
        })
        .to(
          ".save-btn",
          { backgroundColor: "#FAF8F5", color: "#0D0D12", duration: 0.2 },
          "-=0.1",
        )
        .to(".fake-cursor", { opacity: 0, duration: 0.5, delay: 0.5 })
        .set(".day-cell-3", {
          backgroundColor: "transparent",
          color: "#FAF8F5",
        })
        .set(".save-btn", { backgroundColor: "#2A2A35", color: "#FAF8F5" })
        .set(".fake-cursor", { x: 0, y: 0, opacity: 1 });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl">
      <h3 className="mb-2 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.whyUs2Title")}
      </h3>
      <p className="font-sans text-sm text-[#FAF8F5]/60 mb-6 font-medium">
        {t("landing.whyUs2Desc")}
      </p>

      <div className="relative flex-1 rounded-2xl bg-[#0D0D12] p-4 font-mono text-xs">
        <div className="flex justify-between gap-1 mb-6">
          {days.map((d, i) => (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A35] text-[#FAF8F5] day-cell-${i}`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="save-btn rounded-lg bg-[#2A2A35] px-4 py-2 font-bold text-[#FAF8F5]">
            {t("landing.save")}
          </div>
        </div>

        <MousePointer2
          className="fake-cursor absolute top-4 left-4 z-10 text-white drop-shadow-md"
          size={18}
          fill="black"
        />
      </div>
    </div>
  );
};

const Features = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={containerRef}
      className="bg-[#0D0D12] px-6 py-32 md:px-16 lg:px-24"
    >
      <div className="mx-auto max-w-[1400px]">
        <h2 className="mb-16 font-sans text-4xl font-bold tracking-tight text-[#FAF8F5] md:text-5xl">
          {t("landing.coreMechanicsTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="feature-card h-full">
            <ShufflerCard />
          </div>
          <div className="feature-card h-full">
            <TypewriterCard />
          </div>
          <div className="feature-card h-full">
            <SchedulerCard />
          </div>
        </div>
      </div>
    </section>
  );
};

// --- E. HOW LEAGUES WORK ---
const HowLeaguesWork = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".step-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
      });
      
      gsap.from(".connector-line", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
        scaleX: 0,
        transformOrigin: "left",
        duration: 1.2,
        ease: "power3.out",
        delay: 0.4,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="leagues" ref={containerRef} className="bg-[#16161C] px-6 py-32 md:px-16 lg:px-24 rounded-[3rem] mx-4 my-12 border border-[#2A2A35] relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0D0D12]/40 to-transparent" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <Trophy className="w-4 h-4" />
            {t("landing.leaguesTitle")}
          </div>
          <h2 className="text-4xl md:text-6xl font-sans font-bold mb-6 text-[#FAF8F5]">
            {t("landing.howLeaguesWorkTitle")}
          </h2>
          <p className="text-xl text-[#FAF8F5]/60 max-w-2xl mx-auto font-medium">
            {t("landing.leaguesSubtitle")}
          </p>
        </div>

        <div className="relative pt-12">
          {/* Connector Line (Desktop) */}
          <div className="connector-line hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-px border-t-2 border-dashed border-[#22C55E]/30 z-0" />

          <div className="grid md:grid-cols-3 gap-16 relative z-10">
            <div className="step-card flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-8 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  1
                </div>
                <Users className="w-10 h-10" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-3 text-[#FAF8F5]">{t("landing.howLeaguesStep1")}</h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">{t("landing.howLeaguesStep1Desc")}</p>
            </div>

            <div className="step-card flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-8 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  2
                </div>
                <Target className="w-10 h-10" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-3 text-[#FAF8F5]">{t("landing.howLeaguesStep2")}</h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">{t("landing.howLeaguesStep2Desc")}</p>
            </div>

            <div className="step-card flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-8 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  3
                </div>
                <Trophy className="w-10 h-10" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-3 text-[#FAF8F5]">{t("landing.howLeaguesStep3")}</h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">{t("landing.howLeaguesStep3Desc")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- D. PHILOSOPHY ---
const Philosophy = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".phil-elem", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
        },
        y: 30,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: "power2.out",
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="philosophy"
      ref={containerRef}
      className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-[#0D0D12] px-6 py-24 text-center md:px-16"
    >
      <div className="absolute inset-0 z-0 opacity-10">
        <img
          src="https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?q=80&w=3000&auto=format&fit=crop"
          className="h-full w-full object-cover grayscale"
          alt="texture"
        />
      </div>
      <div className="relative z-10 max-w-5xl">
        <p className="phil-elem mb-8 font-sans text-xl font-medium tracking-wide text-[#FAF8F5]/50 md:text-3xl">
          {t("landing.philosophyTitle")}
        </p>
        <p className="phil-elem font-serif text-5xl italic text-[#FAF8F5] md:text-[5.5rem] md:leading-tight">
           <span className="whitespace-pre-wrap">{t("landing.philosophyHighlight")}</span>
        </p>
      </div>
    </section>
  );
};

// --- F. GET STARTED ---
const CTA = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  
  return (
    <section className="bg-[#0D0D12] px-6 py-32 md:px-16 text-center border-t border-[#2A2A35]">
      <h2 className="font-sans font-bold text-4xl md:text-5xl text-[#FAF8F5] mb-6">
        {session ? t("landing.dashboard") : t("landing.readyToCompete")}
      </h2>
      <p className="text-lg text-[#FAF8F5]/60 mb-12 max-w-xl mx-auto font-medium">
        {session ? "" : t("landing.createAccountCta")}
      </p>
      {session ? (
        <Link
          to="/dashboard"
          className="inline-flex group relative overflow-hidden rounded-full bg-[#22C55E] px-10 py-5 text-lg font-bold text-[#0D0D12] shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 hover:scale-[1.03]"
        >
          <span className="relative z-10 flex items-center gap-3">
            {t("landing.dashboard")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#FAF8F5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
        </Link>
      ) : (
        <Link
          to="/auth"
          className="inline-flex group relative overflow-hidden rounded-full bg-[#22C55E] px-10 py-5 text-lg font-bold text-[#0D0D12] shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 hover:scale-[1.03]"
        >
          <span className="relative z-10 flex items-center gap-3">
            {t("landing.createFreeAccount")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#FAF8F5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
        </Link>
      )}
    </section>
  );
};

// --- G. FOOTER ---
const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#05050A] rounded-t-[4rem] px-8 py-20 md:px-24 relative z-20 border-t border-[#2A2A35]">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="font-sans text-2xl font-bold text-[#FAF8F5] mb-4 flex items-center gap-2">
            <img src="/logo.png" alt="Dartstreak Logo" className="w-6 h-6 object-contain" />
            Dartstreak.
          </div>
          <p className="text-[#FAF8F5]/60 max-w-xs mb-8">
            {t("landing.footerDesc")}
          </p>

          <div className="flex items-center gap-3 font-mono text-xs font-bold text-[#FAF8F5] border border-[#2A2A35] rounded-full px-4 py-2 inline-flex bg-[#0D0D12]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            {t("landing.systemOperational")}
          </div>
        </div>

        <div>
           <h4 className="font-sans text-sm font-bold text-[#22C55E] mb-6 uppercase tracking-widest">
            {t("landing.footerHome")}
          </h4>
          <ul className="space-y-4 text-sm font-medium text-[#FAF8F5]/70">
            <li><Link to="/leagues" className="hover:text-[#FAF8F5] transition-colors">{t("landing.footerLeagues")}</Link></li>
            <li><Link to="/training" className="hover:text-[#FAF8F5] transition-colors">{t("landing.footerTraining")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-sans text-sm font-bold text-[#22C55E] mb-6 uppercase tracking-widest">
            {t("landing.footerLegal")}
          </h4>
          <ul className="space-y-4 text-sm font-medium text-[#FAF8F5]/70">
            <li><Link to="/privacy" className="hover:text-[#FAF8F5] transition-colors">{t("landing.footerPrivacyPolicy")}</Link></li>
            <li><Link to="/terms" className="hover:text-[#FAF8F5] transition-colors">{t("landing.footerTermsOfService")}</Link></li>
            <li><Link to="/contact" className="hover:text-[#FAF8F5] transition-colors">{t("landing.footerContact")}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default function Index() {
  return (
    <div className="min-h-screen bg-[#0D0D12] text-[#FAF8F5] font-sans selection:bg-[#22C55E] selection:text-[#0D0D12] overflow-x-hidden pt-4">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root {
          --font-sans: 'Inter', sans-serif;
          --font-serif: 'Playfair Display', serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        .font-sans { font-family: var(--font-sans); }
        .font-serif { font-family: var(--font-serif); }
        .font-mono { font-family: var(--font-mono); }
        
        body { background-color: #0D0D12; }
      `,
        }}
      />
      <NoiseOverlay />
      <Navbar />
      <Hero />
      <Features />
      <HowLeaguesWork />
      <Philosophy />
      <CTA />
      <Footer />
    </div>
  );
}
