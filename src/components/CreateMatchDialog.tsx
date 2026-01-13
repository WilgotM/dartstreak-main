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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Swords, Users, Wifi, WifiOff } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useMatch } from "@/hooks/useMatch";

interface CreateMatchDialogProps {
  children: React.ReactNode;
}

export function CreateMatchDialog({ children }: CreateMatchDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [startingScore, setStartingScore] = useState<string>("501");
  const [checkoutType, setCheckoutType] = useState<string>("double_out");
  const [isOffline, setIsOffline] = useState(false);
  const [legsToWin, setLegsToWin] = useState(1);
  const [setsToWin, setSetsToWin] = useState(1);
  const [creating, setCreating] = useState(false);

  const { friends, loading: friendsLoading } = useFriends();
  const { createMatch, isGuest } = useMatch();

  const effectiveIsOffline = isGuest ? true : isOffline;

  const handleCreate = async () => {
    if (!effectiveIsOffline && !selectedFriend) {
      toast.error(t("match.selectOpponent"));
      return;
    }

    setCreating(true);
    const { error, matchId } = await createMatch(
      effectiveIsOffline ? null : selectedFriend,
      parseInt(startingScore),
      checkoutType as "straight_out" | "double_out",
      effectiveIsOffline,
      legsToWin,
      setsToWin
    );
    setCreating(false);

    if (error) {
      toast.error(t("match.couldNotCreate"));
    } else if (matchId) {
      if (effectiveIsOffline) {
        toast.success(t("match.offlineMatchCreated"));
        setOpen(false);
        navigate(`/offline-match/${matchId}`);
      } else {
        toast.success(t("match.challengeSent"));
        setOpen(false);
        navigate(`/match/${matchId}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            {t("match.createMatch")}
          </DialogTitle>
          <DialogDescription>{t("match.createMatchDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Online/Offline toggle */}
          <div className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${isGuest ? "opacity-75" : ""}`}>
            <div className="flex items-center gap-3">
              {effectiveIsOffline ? (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Wifi className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {effectiveIsOffline ? t("match.offlineMode") : t("match.onlineMode")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGuest ? t("match.guestWarning") : effectiveIsOffline ? t("match.offlineModeDesc") : t("match.onlineModeDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={effectiveIsOffline}
              onCheckedChange={setIsOffline}
              disabled={isGuest}
            />
          </div>

          {/* Select opponent - only for online */}
          {!effectiveIsOffline && (
            <div className="space-y-2">
              <Label>{t("match.selectOpponent")}</Label>
              {friendsLoading ? (
                <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">{t("match.noFriendsToChallenge")}</p>
                </div>
              ) : (
                <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                  <SelectTrigger>
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
          )}

          {/* Starting score */}
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

          {/* Checkout type */}
          <div className="space-y-2">
            <Label>{t("match.checkoutType")}</Label>
            <Select value={checkoutType} onValueChange={setCheckoutType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight_out">{t("match.straightOut")}</SelectItem>
                <SelectItem value="double_out">{t("match.doubleOut")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {checkoutType === "double_out"
                ? t("match.doubleOutDesc")
                : t("match.straightOutDesc")}
            </p>
          </div>

          {/* Legs to win */}
          <div className="space-y-3">
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
              max={7}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>7</span>
            </div>
          </div>

          {/* Sets to win */}
          <div className="space-y-3">
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
              max={7}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>7</span>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={(!isOffline && !selectedFriend) || creating}
            className="w-full"
            variant="hero"
          >
            <Swords className="w-4 h-4 mr-2" />
            {creating ? t("common.loading") : isOffline ? t("match.startMatch") : t("match.sendChallenge")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
