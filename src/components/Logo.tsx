import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    showText?: boolean;
    iconOnly?: boolean;
}

export function Logo({ className, showText = false, iconOnly = false }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <img
                src="/logo.png"
                alt="DartStreak Logo"
                className={cn("object-contain", iconOnly ? "w-10 h-10" : "w-auto h-12")}
            />
            {showText && (
                <span className="font-display font-bold text-xl">DartStreak</span>
            )}
        </div>
    );
}
