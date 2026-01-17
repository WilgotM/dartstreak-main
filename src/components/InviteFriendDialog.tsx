import { useState } from "react";
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
import { toast } from "sonner";
import { UserPlus, Check, Users } from "lucide-react";
import { useFriends, Friend } from "@/hooks/useFriends";

interface InviteFriendDialogProps {
  leagueId: string;
  leagueName: string;
  children: React.ReactNode;
}

export function InviteFriendDialog({
  leagueId,
  leagueName,
  children,
}: InviteFriendDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const { friends, sendLeagueInvite, loading } = useFriends();

  const handleInvite = async (friend: Friend) => {
    const { error } = await sendLeagueInvite(leagueId, friend.id);
    if (error) {
      toast.error(
        t(`friends.errors.${error.replace(/ /g, "_").toLowerCase()}`) || error
      );
    } else {
      setInvitedFriends((prev) => new Set([...prev, friend.id]));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t("friends.inviteToLeague")}
          </DialogTitle>
          <DialogDescription>
            {t("friends.inviteToLeagueDesc", { name: leagueName })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t("friends.noFriendsToInvite")}</p>
            </div>
          ) : (
            friends.map((friend) => {
              const isInvited = invitedFriends.has(friend.id);
              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <span className="font-medium">{friend.display_name}</span>
                  <Button
                    variant={isInvited ? "ghost" : "default"}
                    size="sm"
                    disabled={isInvited}
                    onClick={() => handleInvite(friend)}
                  >
                    {isInvited ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        {t("friends.invited")}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        {t("friends.invite")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
