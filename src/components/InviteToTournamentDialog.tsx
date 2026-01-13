import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Users } from "lucide-react";

interface Friend {
  id: string;
  display_name: string;
}

interface InviteToTournamentDialogProps {
  children: React.ReactNode;
  friends: Friend[];
  onInvite: (userId: string) => void;
}

export function InviteToTournamentDialog({
  children,
  friends,
  onInvite,
}: InviteToTournamentDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const handleInvite = (userId: string) => {
    onInvite(userId);
    setInvitedIds((prev) => [...prev, userId]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t("tournament.inviteFriends")}
          </DialogTitle>
        </DialogHeader>

        {friends.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("tournament.noFriendsToInvite")}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {friends.map((friend) => {
                const isInvited = invitedIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="font-medium">{friend.display_name}</span>
                    <Button
                      size="sm"
                      variant={isInvited ? "outline" : "default"}
                      onClick={() => handleInvite(friend.id)}
                      disabled={isInvited}
                    >
                      {isInvited
                        ? t("tournament.invited")
                        : t("tournament.invite")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
