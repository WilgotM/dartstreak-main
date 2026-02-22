22import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LandingLanguageSwitch } from "@/components/LandingLanguageSwitch";
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
  const { session } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      data-landing-nav
      style={{
        top: isScrolled ? "16px" : "24px",
        width: isScrolled ? "auto" : "90%",
        maxWidth: isScrolled ? "360px" : "64rem",
        padding: isScrolled ? "8px 24px" : "16px 32px",
        borderRadius: isScrolled ? "9999px" : "2rem",
        transition: "top 500ms cubic-bezier(0.4,0,0.2,1), width 500ms cubic-bezier(0.4,0,0.2,1), max-width 500ms cubic-bezier(0.4,0,0.2,1), padding 500ms cubic-bezier(0.4,0,0.2,1), border-radius 500ms cubic-bezier(0.4,0,0.2,1)",
      }}
      className="fixed inset-x-0 z-[100] mx-auto flex items-center justify-between border border-[#2A2A35] bg-[#0D0D12]/80 shadow-2xl backdrop-blur-xl"
    >
      <div className="font-sans text-xl font-bold tracking-tight text-[#FAF8F5] flex items-center gap-2 shrink-0">
        <img
          src="/logo.png"
          alt="Dartstreak Logo"
          className={`object-contain transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isScrolled ? "w-5 h-5" : "w-6 h-6"}`}
        />
        <span className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isScrolled ? "text-lg" : "text-xl"}`}>
          DartStreak
        </span>
      </div>

      {/* Always rendered — animated via opacity, max-width, and overflow */}
      <div
        className="hidden md:flex items-center gap-8 overflow-visible transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          opacity: isScrolled ? 0 : 1,
          maxWidth: isScrolled ? "0px" : "600px",
          marginLeft: isScrolled ? "0px" : "auto",
          marginRight: isScrolled ? "0px" : "auto",
          pointerEvents: isScrolled ? "none" : "auto",
        }}
      >
        {[
          { id: "features", label: t("landing.navFeatures") },
          { id: "leagues", label: t("landing.navLeagues") },
          { id: "philosophy", label: t("landing.navPhilosophy") },
        ].map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="text-sm font-medium text-[#FAF8F5]/70 transition-all hover:-translate-y-[1px] hover:text-[#22C55E] whitespace-nowrap"
          >
            {link.label}
          </a>
        ))}
        <LandingLanguageSwitch />
      </div>

      <div
        className="transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0"
        style={{ marginLeft: isScrolled ? "24px" : "0px" }}
      >
        {session ? (
          <Link
            to="/dashboard"
            className={`group relative flex items-center justify-center overflow-hidden rounded-full bg-[#FAF8F5] font-semibold text-[#0D0D12] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] active:scale-[0.97] ${
              isScrolled ? "px-4 py-1.5 text-xs" : "px-6 py-2.5 text-sm"
            }`}
          >
            <span className="relative z-10 transition-colors group-hover:text-[#FAF8F5]">
              {t("landing.dashboard")}
            </span>
            <span className="absolute inset-0 z-0 h-full w-full -translate-x-[101%] bg-[#22C55E] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`group relative flex items-center justify-center overflow-hidden rounded-full bg-[#FAF8F5] font-semibold text-[#0D0D12] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] active:scale-[0.97] ${
              isScrolled ? "px-4 py-1.5 text-xs" : "px-6 py-2.5 text-sm"
            }`}
          >
            <span className="relative z-10 transition-colors group-hover:text-[#FAF8F5]">
              {t("landing.login")}
            </span>
            <span className="absolute inset-0 z-0 h-full w-full -translate-x-[101%] bg-[#22C55E] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
          </Link>
        )}
      </div>
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
      {/* Background video & gradient overlay */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover object-center scale-[1.01]"
        >
          <source src="/Startsidapexels.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/70 to-[#0D0D12]/40" />
      </div>

      <div className="relative z-10 w-full px-6 md:px-16 lg:w-2/3 lg:px-24">
        <div className="hero-elem text-sm font-medium uppercase tracking-[0.2em] text-[#22C55E] mb-4">
          {t("landing.tagline")}
        </div>
        <h1 className="hero-elem mb-2 font-sans text-5xl font-bold tracking-tight text-[#FAF8F5] sm:text-7xl lg:text-8xl">
          {t("landing.heroTitle")}
        </h1>
        <h1 className="hero-elem mb-10 font-serif text-6xl italic text-[#FAF8F5] sm:text-8xl lg:text-[10rem] lg:leading-[0.85]">
          <span className="not-italic font-bold font-sans text-[#22C55E]">
            {t("landing.heroHighlight")}
          </span>
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
const manualEntrySequence = [20, 14, 5];
const manualEntryCueTimes = [2.29, 4.15, 5.85];

const leagueRaceFrames = [
  [
    { id: "alex", points: 126 },
    { id: "you", points: 123 },
    { id: "lin", points: 121 },
    { id: "mika", points: 118 },
  ],
  [
    { id: "alex", points: 129 },
    { id: "lin", points: 128 },
    { id: "you", points: 127 },
    { id: "mika", points: 121 },
  ],
  [
    { id: "you", points: 136 },
    { id: "alex", points: 132 },
    { id: "lin", points: 130 },
    { id: "mika", points: 126 },
  ],
];

const streakDays = ["M", "T", "W", "T", "F", "S", "S"];

const LiveScoringCard = () => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(0);
  const enteredThrows = manualEntrySequence.slice(0, step);
  const activeSlot = step > 0 ? step - 1 : null;
  const total = enteredThrows.reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    let frameId = 0;

    const syncWithVideo = () => {
      const video = videoRef.current;
      if (video) {
        const currentTime = video.currentTime;
        const nextStep = manualEntryCueTimes.filter(
          (cue) => currentTime >= cue,
        ).length;
        setStep((prev) => (prev === nextStep ? prev : nextStep));
      }
      frameId = window.requestAnimationFrame(syncWithVideo);
    };

    frameId = window.requestAnimationFrame(syncWithVideo);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".manual-entry-total",
        { scale: 0.92 },
        { scale: 1, duration: 0.4, ease: "power2.out" },
      );

      gsap.fromTo(
        ".manual-entry-progress",
        { width: "0%" },
        { width: `${(step / 9) * 100}%`, duration: 0.6, ease: "power3.out" },
      );

      if (activeSlot !== null) {
        gsap.fromTo(
          `.manual-entry-chip-${activeSlot}`,
          { scale: 0.88, y: 8, opacity: 0.6 },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: "back.out(2)",
          },
        );
      }
    }, cardRef);

    return () => ctx.revert();
  }, [step, activeSlot]);

  return (
    <div
      ref={cardRef}
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl"
    >
      <div className="absolute right-8 top-8 inline-flex items-center gap-2 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#22C55E]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
        {t("landing.featureVideoInputBadge")}
      </div>

      <h3 className="mb-2 pr-16 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.featureLiveScoreTitle")}
      </h3>
      <p className="mb-6 font-sans text-sm font-medium text-[#FAF8F5]/60">
        {t("landing.featureLiveScoreDesc")}
      </p>

      <div className="flex flex-1 flex-col gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-[#2A2A35] bg-black">
          <video
            ref={videoRef}
            src="/landing-throw.mov"
            autoPlay
            muted
            loop
            playsInline
            className="aspect-square w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D0D12]/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FAF8F5]/65">
            {t("landing.inProgress")}
          </div>
        </div>

        <div className="rounded-2xl border border-[#2A2A35] bg-[#0D0D12] p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#FAF8F5]/60">
            <span>{t("landing.featureThrowsLoggedLabel")}</span>
            <span className="manual-entry-total font-bold text-[#FAF8F5]">
              {step}/9
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#2A2A35]">
            <div className="manual-entry-progress h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#7CF29E]" />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <div
                key={slot}
                className={`manual-entry-chip manual-entry-chip-${slot} rounded-xl border py-2 text-center font-mono text-sm font-bold ${
                  enteredThrows[slot] !== undefined
                    ? "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#FAF8F5]"
                    : "border-[#2A2A35] bg-[#16161C] text-[#FAF8F5]/35"
                }`}
              >
                {enteredThrows[slot] ?? "—"}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-[#FAF8F5]/60">
            <span>{t("landing.featureEntryTotalLabel")}</span>
            <span className="manual-entry-total font-mono text-base font-bold text-[#22C55E]">
              {total}
            </span>
          </div>
        </div>
      </div>

      <div className="sr-only">
        {enteredThrows.map((throwValue, idx) => (
          <span key={`${throwValue}-${idx}`}>{throwValue}</span>
        ))}
      </div>
    </div>
  );
};

const LeagueMomentumCard = () => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  const players = [
    { id: "you", name: t("match.you"), highlight: true },
    { id: "alex", name: "Alex", highlight: false },
    { id: "lin", name: "Lin", highlight: false },
    { id: "mika", name: "Mika", highlight: false },
  ];

  const frame = leagueRaceFrames[frameIndex];
  const positions = new Map(
    frame.map((entry, index) => [
      entry.id,
      { rank: index + 1, points: entry.points },
    ]),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % leagueRaceFrames.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".league-row",
        { opacity: 0.7 },
        { opacity: 1, duration: 0.35, stagger: 0.05, ease: "power2.out" },
      );

      gsap.fromTo(
        ".league-row-you",
        { boxShadow: "0 0 0 rgba(34,197,94,0)" },
        {
          boxShadow: "0 0 24px rgba(34,197,94,0.25)",
          duration: 0.5,
          repeat: 1,
          yoyo: true,
          ease: "power1.inOut",
        },
      );
    }, cardRef);

    return () => ctx.revert();
  }, [frameIndex]);

  return (
    <div
      ref={cardRef}
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl"
    >
      <div className="absolute right-8 top-8 inline-flex items-center gap-2 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#22C55E]">
        <TrendingUp className="h-3.5 w-3.5" />
        {t("landing.leaderboard")}
      </div>

      <h3 className="mb-2 pr-16 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.featureLeagueRaceTitle")}
      </h3>
      <p className="mb-6 font-sans text-sm font-medium text-[#FAF8F5]/60">
        {t("landing.featureLeagueRaceDesc")}
      </p>

      <div className="relative flex-1 rounded-2xl border border-[#2A2A35] bg-[#0D0D12] p-4">
        <div className="relative h-[216px]">
          {players.map((player) => {
            const current = positions.get(player.id);
            if (!current) return null;

            return (
              <div
                key={player.id}
                className={`league-row absolute left-0 right-0 flex items-center justify-between rounded-xl border px-3 py-2 transition-[top] duration-700 ease-out ${
                  player.highlight
                    ? "league-row-you border-[#22C55E]/40 bg-[#22C55E]/10"
                    : "border-[#2A2A35] bg-[#16161C]"
                }`}
                style={{ top: `${(current.rank - 1) * 54}px` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A2A35] font-mono text-xs font-bold text-[#FAF8F5]">
                    {current.rank}
                  </div>
                  <div className="font-sans text-sm font-semibold text-[#FAF8F5]">
                    {player.name}
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-[#22C55E]">
                  {current.points}p
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StreakProgressCard = () => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeDay, setActiveDay] = useState(0);
  const streakLength = 12 + activeDay;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveDay((prev) => (prev + 1) % streakDays.length);
    }, 1100);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.streak-day-${activeDay}`,
        { scale: 0.88, y: 8 },
        { scale: 1, y: 0, duration: 0.35, ease: "back.out(2)" },
      );

      gsap.fromTo(
        ".streak-counter",
        { scale: 0.9 },
        { scale: 1, duration: 0.4, ease: "power2.out" },
      );
    }, cardRef);

    return () => ctx.revert();
  }, [activeDay]);

  return (
    <div
      ref={cardRef}
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[2rem] border border-[#2A2A35] bg-[#16161C] p-8 shadow-2xl"
    >
      <h3 className="mb-2 font-sans text-xl font-bold text-[#FAF8F5]">
        {t("landing.featureStreakTitle")}
      </h3>
      <p className="mb-6 font-sans text-sm font-medium text-[#FAF8F5]/60">
        {t("landing.featureStreakDesc")}
      </p>

      <div className="flex flex-1 flex-col rounded-2xl border border-[#2A2A35] bg-[#0D0D12] p-5">
        <div className="streak-counter mb-5 flex items-center justify-between rounded-xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3">
          <div className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-[#FAF8F5]">
            <Flame className="h-4 w-4 text-[#22C55E]" />
            {t("landing.featureCurrentStreakLabel")}
          </div>
          <div className="font-mono text-2xl font-bold text-[#22C55E]">
            {streakLength}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-7 gap-2">
          {streakDays.map((day, index) => {
            const isDone = index <= activeDay;
            return (
              <div
                key={`${day}-${index}`}
                className={`streak-day-${index} flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-bold transition-colors duration-300 ${
                  isDone
                    ? "border-[#22C55E]/35 bg-[#22C55E]/15 text-[#FAF8F5]"
                    : "border-[#2A2A35] bg-[#16161C] text-[#FAF8F5]/45"
                }`}
              >
                <span>{day}</span>
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-auto grid h-16 grid-cols-6 items-end gap-2">
          {[20, 28, 35, 42, 50, 58].map((height, index) => (
            <div
              key={index}
              className="h-full overflow-hidden rounded-md bg-[#2A2A35]"
            >
              <div
                className="h-full rounded-md bg-gradient-to-t from-[#22C55E] to-[#7CF29E] transition-transform duration-700 ease-out"
                style={{
                  transform: `translateY(${index <= activeDay ? Math.max(0, 65 - height - activeDay * 2) : 70}%)`,
                }}
              />
            </div>
          ))}
        </div>
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
            <LiveScoringCard />
          </div>
          <div className="feature-card h-full">
            <LeagueMomentumCard />
          </div>
          <div className="feature-card h-full">
            <StreakProgressCard />
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
    <section
      id="leagues"
      ref={containerRef}
      className="bg-[#16161C] px-6 py-20 md:px-16 lg:px-24 rounded-[3rem] mx-4 my-10 border border-[#2A2A35] relative overflow-hidden"
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0D0D12]/40 to-transparent" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <Trophy className="w-4 h-4" />
            {t("landing.leaguesTitle")}
          </div>
          <h2 className="text-4xl md:text-5xl font-sans font-bold mb-5 text-[#FAF8F5]">
            {t("landing.howLeaguesWorkTitle")}
          </h2>
          <p className="text-lg text-[#FAF8F5]/60 max-w-xl mx-auto font-medium">
            {t("landing.leaguesSubtitle")}
          </p>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) — top-10 = 40px = exactly half of h-20 circle */}
          <div className="connector-line hidden md:block absolute top-10 left-[16.6667%] right-[16.6667%] h-px border-t-2 border-dashed border-[#22C55E]/30 z-0" />

          <div className="grid md:grid-cols-3 gap-10 relative z-10">
            <div className="step-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  1
                </div>
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-sans font-bold text-xl mb-2 text-[#FAF8F5]">
                {t("landing.howLeaguesStep1")}
              </h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">
                {t("landing.howLeaguesStep1Desc")}
              </p>
            </div>

            <div className="step-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  2
                </div>
                <Target className="w-8 h-8" />
              </div>
              <h3 className="font-sans font-bold text-xl mb-2 text-[#FAF8F5]">
                {t("landing.howLeaguesStep2")}
              </h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">
                {t("landing.howLeaguesStep2Desc")}
              </p>
            </div>

            <div className="step-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#0D0D12] border-4 border-[#16161C] flex items-center justify-center text-[#22C55E] mb-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#22C55E] text-[#0D0D12] flex items-center justify-center font-bold text-sm shadow-md">
                  3
                </div>
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="font-sans font-bold text-xl mb-2 text-[#FAF8F5]">
                {t("landing.howLeaguesStep3")}
              </h3>
              <p className="text-[#FAF8F5]/60 font-medium leading-relaxed">
                {t("landing.howLeaguesStep3Desc")}
              </p>
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
          <span className="whitespace-pre-wrap">
            {t("landing.philosophyHighlight")}
          </span>
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
            {t("landing.dashboard")}{" "}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-[#FAF8F5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0" />
        </Link>
      ) : (
        <Link
          to="/auth"
          className="inline-flex group relative overflow-hidden rounded-full bg-[#22C55E] px-10 py-5 text-lg font-bold text-[#0D0D12] shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 hover:scale-[1.03]"
        >
          <span className="relative z-10 flex items-center gap-3">
            {t("landing.createFreeAccount")}{" "}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
            <img
              src="/logo.png"
              alt="Dartstreak Logo"
              className="w-6 h-6 object-contain"
            />
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
            <li>
              <Link
                to="/leagues"
                className="hover:text-[#FAF8F5] transition-colors"
              >
                {t("landing.footerLeagues")}
              </Link>
            </li>
            <li>
              <Link
                to="/training"
                className="hover:text-[#FAF8F5] transition-colors"
              >
                {t("landing.footerTraining")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-sans text-sm font-bold text-[#22C55E] mb-6 uppercase tracking-widest">
            {t("landing.footerLegal")}
          </h4>
          <ul className="space-y-4 text-sm font-medium text-[#FAF8F5]/70">
            <li>
              <Link
                to="/privacy"
                className="hover:text-[#FAF8F5] transition-colors"
              >
                {t("landing.footerPrivacyPolicy")}
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                className="hover:text-[#FAF8F5] transition-colors"
              >
                {t("landing.footerTermsOfService")}
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className="hover:text-[#FAF8F5] transition-colors"
              >
                {t("landing.footerContact")}
              </Link>
            </li>
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
      <Hero />
      <HowLeaguesWork />
      <Features />
      <Philosophy />
      <CTA />
      <Footer />
      <Navbar />
    </div>
  );
}
