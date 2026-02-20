import { motion } from "framer-motion";

export function MobileHeader() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 md:hidden pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-background/95 border-b border-border" />
      <div className="relative flex items-center justify-between h-14 px-4 z-10">
        <div className="flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="DartStreak Logo"
            className="w-8 h-8 object-contain"
            whileTap={{ scale: 0.95 }}
          />
        </div>
      </div>
    </nav>
  );
}
