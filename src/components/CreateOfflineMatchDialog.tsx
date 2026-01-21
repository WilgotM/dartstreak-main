import { useState, useEffect } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { WifiOff, Play, Target, Trophy, User, Users, UserPlus, Trash2, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { useMatch } from "@/hooks/useMatch";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NumberPicker } from "@/components/ui/number-picker";
import { getRandomBotName } from "@/utils/botNames";

interface CreateOfflineMatchDialogProps {
  children: React.ReactNode;
}

export function CreateOfflineMatchDialog({ children }: CreateOfflineMatchDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const [startingScore, setStartingScore] = useState<string>("501");
  const [checkoutType, setCheckoutType] = useState<string>("double_out");
  const [legsToWin, setLegsToWin] = useState(1);
  const [setsToWin, setSetsToWin] = useState(1);
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [creating, setCreating] = useState(false);
  const [playVsBot, setPlayVsBot] = useState(false);
  const [botLevel, setBotLevel] = useState(5);

  const { createMatch } = useMatch();

  // Bot level definitions (same as tournaments)
  const botLevels = [
    { level: 1, min: 20, max: 25, label: "Level 1" },
    { level: 2, min: 26, max: 30, label: "Level 2" },
    { level: 3, min: 31, max: 35, label: "Level 3" },
    { level: 4, min: 36, max: 40, label: "Level 4" },
    { level: 5, min: 41, max: 45, label: "Level 5" },
    { level: 6, min: 46, max: 50, label: "Level 6" },
    { level: 7, min: 51, max: 55, label: "Level 7" },
    { level: 8, min: 56, max: 60, label: "Level 8" },
    { level: 9, min: 61, max: 65, label: "Level 9" },
    { level: 10, min: 66, max: 70, label: "Level 10" },
    { level: 11, min: 71, max: 75, label: "Level 11" },
    { level: 12, min: 76, max: 80, label: "Level 12" },
    { level: 13, min: 81, max: 85, label: "Level 13" },
    { level: 14, min: 86, max: 90, label: "Level 14" },
    { level: 15, min: 91, max: 95, label: "Level 15" },
    { level: 16, min: 96, max: 100, label: "Level 16" },
    { level: 17, min: 101, max: 110, label: "Level 17" },
    { level: 18, min: 110, max: 120, label: "Level 18" },
  ];

  const currentBotLevel = botLevels[botLevel - 1];
  const botAverage = Math.round((currentBotLevel.min + currentBotLevel.max) / 2);

  // Initialize player 1 name from profile
  useEffect(() => {
    if (open) {
      if (profile?.display_name) {
        setPlayer1Name(profile.display_name);
      } else {
        setPlayer1Name(t("match.player1"));
      }
      setPlayer2Name(t("match.player2"));
    }
  }, [open, profile, t]);

  const handleCreate = async () => {
    if (!player1Name.trim()) {
      toast.error(t("match.enterPlayerNames"));
      return;
    }
    if (!playVsBot && !player2Name.trim()) {
      toast.error(t("match.enterPlayerNames"));
      return;
    }

    const botName = playVsBot ? getRandomBotName() : null;
    const botInfoData = playVsBot ? { bot_name: botName!, bot_average: botAverage } : null;

    setCreating(true);
    const { error, matchId } = await createMatch(
      null,
      parseInt(startingScore),
      checkoutType as "straight_out" | "double_out",
      true, // isOffline
      legsToWin,
      setsToWin,
      { p1: player1Name, p2: playVsBot ? botName! : player2Name },
      true, // forceLocal
      80, // throwTimeLimit
      botInfoData
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

  const resetPlayer1ToMe = () => {
    if (profile?.display_name) {
      setPlayer1Name(profile.display_name);
    }
  };

  const isPlayer1Me = profile?.display_name && player1Name === profile.display_name;

  const MatchForm = ({ className }: { className?: string }) => (
    <div className={cn("space-y-6", className)}>
      {/* Play vs Bot Toggle */}
      <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-medium">{t("match.playVsBot")}</Label>
            <p className="text-xs text-muted-foreground">{t("match.playVsBotDesc")}</p>
          </div>
        </div>
        <Switch
          checked={playVsBot}
          onCheckedChange={setPlayVsBot}
        />
      </div>

      {/* Player Names */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {t("match.players")}
        </Label>
        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
             <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder={t("match.player1")}
                  className="pl-9 bg-card"
                />
              </div>
              
              {profile?.display_name && (
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={isPlayer1Me ? () => setPlayer1Name("") : resetPlayer1ToMe}
                  title={isPlayer1Me ? t("common.remove") : t("common.useMyAccount")}
                  className={cn("shrink-0", isPlayer1Me ? "text-destructive hover:text-destructive" : "text-primary hover:text-primary")}
                >
                  {isPlayer1Me ? <Trash2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </Button>
              )}
             </div>
             {profile?.display_name && !isPlayer1Me && (
               <p className="text-[10px] text-muted-foreground mt-1 ml-1">{t("match.tapPlusToUseAccount")}</p>
             )}
          </div>

          {!playVsBot && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                placeholder={t("match.player2")}
                className="pl-9 bg-card"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bot Level Selector */}
      {playVsBot && (
        <div className="space-y-3 p-4 bg-card/50 rounded-xl border">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {t("match.botLevel")}
            </Label>
            <span className="text-sm font-medium text-primary">
              {t("offlineTournament.botAverageDesc", { average: botAverage })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBotLevel(Math.max(1, botLevel - 1))}
              disabled={botLevel <= 1}
              className="shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <Slider
                value={[botLevel]}
                onValueChange={([v]) => setBotLevel(v)}
                min={1}
                max={18}
                step={1}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBotLevel(Math.min(18, botLevel + 1))}
              disabled={botLevel >= 18}
              className="shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentBotLevel.label}</span>
            <span>~{botAverage} {t("match.avg")}</span>
          </div>
        </div>
      )}

      {/* Starting score */}
      <div className="space-y-3">
        <Label className="text-base">{t("match.startingScore")}</Label>
        <div className="grid grid-cols-3 gap-3">
          {["301", "501", "701"].map((score) => (
            <div
              key={score}
              className={cn(
                "cursor-pointer rounded-xl border-2 p-4 text-center transition-all hover:border-primary/50 relative overflow-hidden",
                startingScore === score
                  ? "border-primary bg-primary/5 font-bold text-primary shadow-sm"
                  : "border-muted bg-card text-muted-foreground hover:bg-accent/50"
              )}
              onClick={() => setStartingScore(score)}
            >
              <div className="text-xl font-display">{score}</div>
              {startingScore === score && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Checkout type */}
      <div className="space-y-3">
        <Label className="text-base">{t("match.checkoutType")}</Label>
        <Tabs value={checkoutType} onValueChange={setCheckoutType} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1">
            <TabsTrigger value="straight_out" className="h-full">{t("match.straightOut")}</TabsTrigger>
            <TabsTrigger value="double_out" className="h-full">{t("match.doubleOut")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed">
          {checkoutType === "double_out"
            ? t("match.doubleOutDesc")
            : t("match.straightOutDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-2">
        {/* Legs to win */}
        <div className="bg-card/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-4 h-4" />
            <Label className="text-base text-foreground">{t("match.legsToWin")}</Label>
          </div>
          <NumberPicker
            value={legsToWin}
            onValueChange={setLegsToWin}
            min={1}
            max={21}
            className="w-full"
          />
        </div>

        {/* Sets to win */}
        <div className="bg-card/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-accent">
            <Trophy className="w-4 h-4" />
            <Label className="text-base text-foreground">{t("match.setsToWin")}</Label>
          </div>
          <NumberPicker
            value={setsToWin}
            onValueChange={setSetsToWin}
            min={1}
            max={11}
            className="w-full"
          />
        </div>
      </div>

      <Button
        onClick={handleCreate}
        disabled={creating}
        className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
        variant="hero"
      >
        {creating ? (
          t("common.loading")
        ) : (
          <>
            <Play className="w-5 h-5 mr-2 fill-current" />
            {t("match.startMatch")}
          </>
        )}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-primary/10 rounded-full">
                <WifiOff className="w-6 h-6 text-primary" />
              </div>
              {t("match.offlineMode")}
            </DialogTitle>
            <DialogDescription>{t("match.offlineModeDesc")}</DialogDescription>
          </DialogHeader>
          <MatchForm className="mt-4" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-2xl">
            <div className="p-2 bg-primary/10 rounded-full">
              <WifiOff className="w-6 h-6 text-primary" />
            </div>
            {t("match.offlineMode")}
          </DrawerTitle>
          <DrawerDescription>{t("match.offlineModeDesc")}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto pb-8">
          <MatchForm />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
