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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Swords, Users, Wifi, Target, Trophy, Clock } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useMatch } from "@/hooks/useMatch";
import { cn } from "@/lib/utils";
import { FriendsSheet } from "@/components/FriendsSheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NumberPicker } from "@/components/ui/number-picker";

interface CreateOnlineMatchDialogProps {
  children: React.ReactNode;
}

export function CreateOnlineMatchDialog({ children }: CreateOnlineMatchDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [startingScore, setStartingScore] = useState<string>("501");
  const [checkoutType, setCheckoutType] = useState<string>("double_out");
  const [legsToWin, setLegsToWin] = useState(1);
  const [setsToWin, setSetsToWin] = useState(1);
  const [throwTimeLimit, setThrowTimeLimit] = useState(80);
  const [creating, setCreating] = useState(false);

  const { friends, loading: friendsLoading } = useFriends();
  const { createMatch, isGuest } = useMatch();

  const handleCreate = async () => {
    if (!selectedFriend) {
      toast.error(t("match.selectOpponent"));
      return;
    }

    setCreating(true);
    const { error, matchId } = await createMatch(
      selectedFriend,
      parseInt(startingScore),
      checkoutType as "straight_out" | "double_out",
      false, // isOffline = false
      legsToWin,
      setsToWin,
      undefined, // playerNames
      false, // forceLocal
      throwTimeLimit
    );
    setCreating(false);

    if (error) {
      toast.error(t("match.couldNotCreate"));
    } else if (matchId) {
      setOpen(false);
      navigate(`/match/${matchId}`);
    }
  };

  if (isGuest) return null;

  const MatchForm = ({ className }: { className?: string }) => (
    <div className={cn("space-y-6", className)}>
      {/* Select opponent */}
      <div className="space-y-2">
        <Label className="text-base">{t("match.selectOpponent")}</Label>
        {friendsLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-4 bg-muted/30 rounded-xl border border-dashed">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t("match.noFriendsToChallenge")}</p>
            <FriendsSheet>
              <Button variant="link" size="sm" className="mt-2">
                {t("friends.addFriends")}
              </Button>
            </FriendsSheet>
          </div>
        ) : (
          <Select value={selectedFriend} onValueChange={setSelectedFriend}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder={t("match.chooseOpponent")} />
            </SelectTrigger>
            <SelectContent>
              {friends.map((friend) => (
                <SelectItem key={friend.id} value={friend.id}>
                  {friend.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

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

        {/* Throw time limit */}
        <div className="bg-card/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-orange-500">
            <Clock className="w-4 h-4" />
            <Label className="text-base text-foreground">{t("match.throwTimeLimit")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <NumberPicker
              value={throwTimeLimit}
              onValueChange={setThrowTimeLimit}
              min={10}
              max={100}
              step={10}
              className="w-full"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("match.seconds")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("match.throwTimeLimitDesc")}</p>
        </div>
      </div>

      <Button
        onClick={handleCreate}
        disabled={!selectedFriend || creating}
        className="w-full h-14 text-lg font-bold shadow-lg shadow-accent/20"
        variant="hero"
      >
        {creating ? (
          t("common.loading")
        ) : (
          <>
            <Swords className="w-5 h-5 mr-2" />
            {t("match.sendChallenge")}
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
              <div className="p-2 bg-accent/10 rounded-full">
                <Wifi className="w-6 h-6 text-accent" />
              </div>
              {t("match.onlineMode")}
            </DialogTitle>
            <DialogDescription>{t("match.onlineModeDesc")}</DialogDescription>
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
            <div className="p-2 bg-accent/10 rounded-full">
              <Wifi className="w-6 h-6 text-accent" />
            </div>
            {t("match.onlineMode")}
          </DrawerTitle>
          <DrawerDescription>{t("match.onlineModeDesc")}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto pb-8">
          <MatchForm />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
