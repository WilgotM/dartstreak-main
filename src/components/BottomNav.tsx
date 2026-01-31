import { useRef, useState, useCallback } from "react";
import { Home, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";
import LiquidGlass from "liquid-glass-react";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home" },
  { to: "/leagues", icon: Trophy, labelKey: "nav.leagues" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
];

// Snap positions
const COLLAPSED_HEIGHT = 80; // px when collapsed
const EXPANDED_HEIGHT_VH = 60; // vh when expanded

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { light, medium } = useHaptics();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Motion values for smooth dragging
  const y = useMotionValue(0);
  const expandedHeight = typeof window !== "undefined"
    ? (window.innerHeight * EXPANDED_HEIGHT_VH) / 100
    : 400;

  // Opacity and blur based on drag position
  const contentOpacity = useTransform(y, [0, -expandedHeight * 0.3], [0, 1]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    medium();
  }, [medium]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const threshold = expandedHeight * 0.3;
    const velocity = info.velocity.y;
    const currentY = y.get();

    // Determine snap target based on velocity and position
    let snapTo = 0;
    if (velocity < -500 || (velocity > -500 && currentY < -threshold)) {
      snapTo = -expandedHeight + COLLAPSED_HEIGHT;
    }

    animate(y, snapTo, {
      type: "spring",
      stiffness: 400,
      damping: 40,
    });

    if (snapTo !== 0) {
      light();
    }
  }, [y, expandedHeight, light]);

  return (
    <>
      {/* Draggable overlay area when expanded */}
      <motion.div
        className="fixed inset-0 z-40 pointer-events-none md:hidden"
        style={{
          opacity: useTransform(y, [0, -expandedHeight * 0.3], [0, 0.4]),
          backgroundColor: "black",
        }}
        onClick={() => animate(y, 0, { type: "spring", stiffness: 400, damping: 40 })}
      />

      {/* Main bottom nav container */}
      <motion.nav
        ref={containerRef}
        className={cn(
          "shrink-0 z-50 fixed bottom-0 left-0 right-0 md:hidden touch-none",
          "px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        )}
        style={{
          y,
          willChange: isDragging ? "transform" : "auto",
          transform: "translate3d(0, 0, 0)",
        }}
        drag="y"
        dragConstraints={{ top: -expandedHeight + COLLAPSED_HEIGHT, bottom: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-2 cursor-grab active:cursor-grabbing"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* LiquidGlass container */}
        <LiquidGlass
          mouseContainer={containerRef}
          displacementScale={70}
          blurAmount={isDragging ? 0 : 0.0625}
          elasticity={0.3}
          cornerRadius={28}
          className="w-full"
          style={{
            willChange: isDragging ? "transform" : "auto",
            transform: "translate3d(0, 0, 0)",
          }}
        >
          {/* Navigation items */}
          <div className="flex items-center justify-center gap-1 h-14 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    light();
                    // Collapse menu on navigation
                    animate(y, 0, { type: "spring", stiffness: 400, damping: 40 });
                  }}
                  className="flex-1"
                >
                  <motion.div
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-colors",
                      isActive
                        ? "bg-neon-green/15 text-neon-green shadow-[0_0_15px_rgba(72,255,160,0.15)]"
                        : "text-gray-300 hover:text-gray-100 hover:bg-white/10"
                    )}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    style={{
                      willChange: "transform",
                      transform: "translate3d(0, 0, 0)",
                    }}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        isActive && "drop-shadow-[0_0_8px_rgba(72,255,160,0.5)]"
                      )}
                    />
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-xs font-bold tracking-wide overflow-hidden whitespace-nowrap"
                      >
                        {t(item.labelKey)}
                      </motion.span>
                    )}
                  </motion.div>
                </RouterNavLink>
              );
            })}
          </div>

          {/* Expanded content area */}
          <motion.div
            className="px-4 pb-4 pt-2 overflow-hidden"
            style={{ opacity: contentOpacity }}
          >
            <div className="text-center text-white/60 text-sm">
              {/* Additional content when expanded can go here */}
            </div>
          </motion.div>
        </LiquidGlass>
      </motion.nav>
    </>
  );
}
