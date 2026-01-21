import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { addMinutes, format, parse, isBefore, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTournaments } from "@/hooks/useTournaments";
import { Globe, Lock, Users, Clock, Bot, ChevronLeft, ChevronRight } from "lucide-react";

interface CreateTournamentDialogProps {
  children: React.ReactNode;
}

export function CreateTournamentDialog({ children }: CreateTournamentDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createTournament } = useTournaments();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [startingScore, setStartingScore] = useState("501");
  const [checkoutType, setCheckoutType] = useState("double_out");
  const [legsToWin, setLegsToWin] = useState([1]);
  const [setsToWin, setSetsToWin] = useState([1]);
  const [startTime, setStartTime] = useState(() => format(addMinutes(new Date(), 15), "HH:mm"));
  const [botLevel, setBotLevel] = useState(5); // Default to level 5 (41-45 avg)

  // Bot level definitions: 18 levels from beginner to pro
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
  // Use midpoint of the range for the average passed to the backend
  const botAverage = Math.round((currentBotLevel.min + currentBotLevel.max) / 2);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);

    const now = new Date();
    let scheduledStartAt = parse(startTime, "HH:mm", now);

    // If the picked time is before or equal to now, it means it's for tomorrow
    if (isBefore(scheduledStartAt, now)) {
      scheduledStartAt = addDays(scheduledStartAt, 1);
    }

    const tournament = await createTournament({
      name: name.trim(),
      is_public: isPublic,
      max_players: maxPlayers,
      starting_score: parseInt(startingScore),
      checkout_type: checkoutType,
      legs_to_win: legsToWin[0],
      sets_to_win: setsToWin[0],
      scheduled_start_at: scheduledStartAt,
      bot_average: botAverage,
    });

    setLoading(false);
    if (tournament) {
      setOpen(false);
      setName("");
      navigate(`/tournament/${tournament.id}`);
    }
  };

  const playerOptions = [4, 8, 16, 32];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tournament.create")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tournament Name */}
          <div className="space-y-2">
            <Label>{t("tournament.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("tournament.namePlaceholder")}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <Label className="text-primary">{t("tournament.startTime")}</Label>
              </div>
              {(() => {
                const now = new Date();
                const picked = parse(startTime, "HH:mm", now);
                if (isBefore(picked, now)) {
                  return (
                    <span className="text-xs font-medium text-amber-600">
                      {t("tournament.startTimeNextDay")}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("tournament.startTimeDesc")}
            </p>
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isPublic ? t("tournament.public") : t("tournament.private")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? t("tournament.publicDesc")
                    : t("tournament.privateDesc")}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Tournament Size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("tournament.size")}
            </Label>
            <div className="flex gap-2">
              {playerOptions.map((num) => (
                <Button
                  key={num}
                  variant={maxPlayers === num ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMaxPlayers(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Bot Difficulty */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              {t("tournament.botDifficulty")}
            </Label>
            <div className="flex items-center justify-between gap-3 p-3 bg-secondary/50 rounded-lg">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setBotLevel(Math.max(1, botLevel - 1))}
                disabled={botLevel === 1}
                className="shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold">
                  {t("tournament.botLevel")} {currentBotLevel.level}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentBotLevel.min}-{currentBotLevel.max} {t("tournament.avg")}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setBotLevel(Math.min(18, botLevel + 1))}
                disabled={botLevel === 18}
                className="shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("tournament.botFillDesc")}
            </p>
          </div>

          {/* Starting Score */}
          <div className="space-y-2">
            <Label>{t("match.startingScore")}</Label>
            <Select value={startingScore} onValueChange={setStartingScore}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="301">301</SelectItem>
                <SelectItem value="501">501</SelectItem>
                <SelectItem value="701">701</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkout Type */}
          <div className="space-y-2">
            <Label>{t("match.checkoutType")}</Label>
            <Select value={checkoutType} onValueChange={setCheckoutType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight_out">
                  {t("match.straightOut")}
                </SelectItem>
                <SelectItem value="double_out">
                  {t("match.doubleOut")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legs to Win */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>{t("match.legsToWin")}</Label>
              <span className="text-sm font-medium">{legsToWin[0]}</span>
            </div>
            <Slider
              value={legsToWin}
              onValueChange={setLegsToWin}
              min={1}
              max={7}
              step={1}
            />
          </div>

          {/* Sets to Win */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>{t("match.setsToWin")}</Label>
              <span className="text-sm font-medium">{setsToWin[0]}</span>
            </div>
            <Slider
              value={setsToWin}
              onValueChange={setSetsToWin}
              min={1}
              max={7}
              step={1}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? t("common.loading") : t("tournament.createAndSchedule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
