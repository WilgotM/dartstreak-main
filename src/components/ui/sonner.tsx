import { useTheme } from "next-themes";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      closeButton
      position="top-right"
      expand={false}
      visibleToasts={2}
      offset={16}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      icons={{
        success: <CircleCheck className="h-4 w-4 text-emerald-300" />,
        error: <CircleAlert className="h-4 w-4 text-red-300" />,
        warning: <TriangleAlert className="h-4 w-4 text-amber-300" />,
        info: <Info className="h-4 w-4 text-sky-300" />,
        close: <X className="h-3.5 w-3.5" />,
      }}
      className="toaster group"
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border-white/10 group-[.toaster]:bg-slate-950/88 group-[.toaster]:px-3.5 group-[.toaster]:py-3 group-[.toaster]:text-slate-100 group-[.toaster]:backdrop-blur-lg group-[.toaster]:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.9)]",
          title: "group-[.toast]:font-display group-[.toast]:font-semibold group-[.toast]:text-[13px] group-[.toast]:leading-tight",
          description: "group-[.toast]:mt-1 group-[.toast]:text-xs group-[.toast]:leading-snug group-[.toast]:text-slate-300",
          icon: "group-[.toast]:text-slate-100",
          closeButton:
            "group-[.toast]:border group-[.toast]:border-white/15 group-[.toast]:bg-white/5 group-[.toast]:text-slate-200 group-[.toast]:hover:bg-white/10",
          success:
            "group-[.toaster]:border-emerald-300/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-emerald-400/12 group-[.toaster]:to-slate-950/88",
          error:
            "group-[.toaster]:border-red-300/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-red-400/12 group-[.toaster]:to-slate-950/88",
          warning:
            "group-[.toaster]:border-amber-300/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-amber-300/14 group-[.toaster]:to-slate-950/88",
          info:
            "group-[.toaster]:border-sky-300/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-sky-400/12 group-[.toaster]:to-slate-950/88",
          actionButton:
            "group-[.toast]:border group-[.toast]:border-white/10 group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:hover:bg-white/20",
          cancelButton:
            "group-[.toast]:border group-[.toast]:border-white/10 group-[.toast]:bg-black/30 group-[.toast]:text-slate-200 group-[.toast]:hover:bg-black/50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
