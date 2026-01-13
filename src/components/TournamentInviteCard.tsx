import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, Check, X } from "lucide-react";

interface TournamentInvite {
  id: string;
  tournament?: {
    name: string;
    max_players: number;
    starting_score: number;
  };
  from_profile?: {
    display_name: string;
  };
}

interface TournamentInviteCardProps {
  invite: TournamentInvite;
  onAccept: () => void;
  onDecline: () => void;
}

export function TournamentInviteCard({
  invite,
  onAccept,
  onDecline,
}: TournamentInviteCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {invite.tournament?.name || t("common.unknown")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("tournament.invitedBy", {
                name: invite.from_profile?.display_name || t("common.unknown"),
              })}
            </p>
            <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {invite.tournament?.max_players} {t("tournament.players")}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {invite.tournament?.starting_score}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={onDecline}
              className="h-9 w-9"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button size="icon" onClick={onAccept} className="h-9 w-9">
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
