import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Swords, WifiOff, Play } from "lucide-react";
import { useMatch } from "@/hooks/useMatch";
import { cn } from "@/lib/utils";

interface CreateOfflineMatchDialogProps {
  children: React.ReactNode;
}

export function CreateOfflineMatchDialog({ children }: CreateOfflineMatchDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [startingScore, setStartingScore] = useState<string>("501");
  const [checkoutType, setCheckoutType] = useState<string>("double_out");
  const [legsToWin, setLegsToWin] = useState(1);
  const [setsToWin, setSetsToWin] = useState(1);
  const [creating, setCreating] = useState(false);

  const { createMatch } = useMatch();

  const handleCreate = async () => {
    setCreating(true);
    const { error, matchId } = await createMatch(
      null,
      parseInt(startingScore),
      checkoutType as "straight_out" | "double_out",
      true, // isOffline
      legsToWin,
      setsToWin
    );
    setCreating(false);

    if (error) {
      toast.error(t("match.couldNotCreate"));
    } else if (matchId) {
      toast.success(t("match.offlineMatchCreated"));
      setOpen(false);
      navigate(`/offline-match/${matchId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-muted-foreground" />
            {t("match.offlineMode")}
          </DialogTitle>
          <DialogDescription>{t("match.offlineModeDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Starting score */}
          <div className="space-y-3">
            <Label>{t("match.startingScore")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {["301", "501", "701"].map((score) => (
                <div
                  key={score}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 text-center transition-all hover:border-primary/50",
                    startingScore === score
                      ? "border-primary bg-primary/5 font-bold text-primary"
                      : "border-muted bg-card text-muted-foreground"
                  )}
                  onClick={() => setStartingScore(score)}
                >
                  {score}
                </div>
              ))}
            </div>
          </div>

          {/* Checkout type */}
          <div className="space-y-3">
            <Label>{t("match.checkoutType")}</Label>
            <Tabs value={checkoutType} onValueChange={setCheckoutType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="straight_out">{t("match.straightOut")}</TabsTrigger>
                <TabsTrigger value="double_out">{t("match.doubleOut")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {checkoutType === "double_out"
                ? t("match.doubleOutDesc")
                : t("match.straightOutDesc")}
            </p>
          </div>

          {/* Legs to win */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("match.legsToWin")}</Label>
              <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                {legsToWin}
              </span>
            </div>
            <Slider
              value={[legsToWin]}
              onValueChange={([value]) => setLegsToWin(value)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Sets to win */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("match.setsToWin")}</Label>
              <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                {setsToWin}
              </span>
            </div>
            <Slider
              value={[setsToWin]}
              onValueChange={([value]) => setSetsToWin(value)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full h-12 text-lg"
            variant="hero"
          >
            {creating ? (
              t("common.loading")
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {t("match.startMatch")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
